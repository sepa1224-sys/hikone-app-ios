#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RapidAPI Navitime Route TotalNavi API 経路検索テストスクリプト
"""

import requests
import json
from datetime import datetime
from typing import Dict, Any, Optional

# API設定
RAPIDAPI_KEY = "457cf9cbadmsh41961ebd0cdbcedp14ffc8jsnbd02f2b02db1"
RAPIDAPI_HOST = "navitime-route-totalnavi.p.rapidapi.com"
BASE_URL = f"https://{RAPIDAPI_HOST}/route_transit"

def search_route(
    start_lat: float,
    start_lon: float,
    goal_lat: float,
    goal_lon: float,
    start_time: Optional[str] = None
) -> Dict[str, Any]:
    """
    緯度・経度を使って経路を検索する関数
    
    Args:
        start_lat: 出発地の緯度
        start_lon: 出発地の経度
        goal_lat: 到着地の緯度
        goal_lon: 到着地の経度
        start_time: 出発時刻（ISO8601形式、指定がなければ現在時刻）
    
    Returns:
        APIレスポンスを辞書として返す
    """
    # start_time が指定されていない場合は現在時刻を使用
    if not start_time:
        start_time = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    
    # クエリパラメータ
    params = {
        "start": f"{start_lon},{start_lat}",  # 経度,緯度の順
        "goal": f"{goal_lon},{goal_lat}",     # 経度,緯度の順
        "datum": "wgs84",
        "term": "1440",      # 検索時間範囲（分）
        "limit": "5",        # 最大結果数
        "start_time": start_time,
        "coord_unit": "degree"
    }
    
    # ヘッダー
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
        "Accept": "application/json"
    }
    
    print("=" * 50)
    print("経路検索リクエスト")
    print("=" * 50)
    print(f"Request URL: {BASE_URL}")
    print(f"Parameters:")
    for key, value in params.items():
        print(f"  {key}: {value}")
    print("=" * 50)
    
    try:
        response = requests.get(BASE_URL, params=params, headers=headers, timeout=30)
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print("=" * 50)
        
        if not response.ok:
            error_text = response.text
            try:
                error_json = response.json()
                print(f"Error JSON: {json.dumps(error_json, indent=2, ensure_ascii=False)}")
            except:
                print(f"Error Text: {error_text}")
            
            return {
                "success": False,
                "status_code": response.status_code,
                "error": error_text,
                "message": f"API request failed with status {response.status_code}"
            }
        
        # JSONレスポンスを辞書に変換
        data = response.json()
        
        print("✓ 経路検索成功")
        print(f"Response Data Structure:")
        print(f"  Top-level keys: {list(data.keys())}")
        if "items" in data:
            print(f"  Items count: {len(data['items'])}")
        print("=" * 50)
        
        return {
            "success": True,
            "status_code": response.status_code,
            "data": data
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Request Exception: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Network error occurred"
        }
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        print(f"Response Text: {response.text}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to parse JSON response"
        }

def display_route_summary(data: Dict[str, Any]) -> None:
    """
    経路案内のサマリーを表示する関数
    
    Args:
        data: APIレスポンスの辞書データ
    """
    if not data.get("success") or "data" not in data:
        print("エラー: 経路データが取得できませんでした")
        return
    
    route_data = data["data"]
    
    if "items" not in route_data or len(route_data["items"]) == 0:
        print("経路が見つかりませんでした")
        return
    
    print("\n" + "=" * 50)
    print("経路案内サマリー")
    print("=" * 50)
    
    for i, item in enumerate(route_data["items"], 1):
        print(f"\n【経路 {i}】")
        
        # 出発地・到着地
        if "summary" in item:
            summary = item["summary"]
            
            # 出発地・到着地情報
            if "start" in summary:
                start = summary["start"]
                print(f"  出発地: {start.get('name', 'N/A')} ({start.get('lat', 'N/A')}, {start.get('lon', 'N/A')})")
            
            if "goal" in summary:
                goal = summary["goal"]
                print(f"  到着地: {goal.get('name', 'N/A')} ({goal.get('lat', 'N/A')}, {goal.get('lon', 'N/A')})")
            
            # 移動時間
            if "move" in summary:
                move = summary["move"]
                if "time" in move:
                    minutes = move["time"] // 60 if isinstance(move["time"], int) else move["time"]
                    print(f"  移動時間: 約 {minutes} 分")
                
                if "distance" in move:
                    distance = move["distance"]
                    print(f"  総距離: 約 {distance} m")
                
                if "transfer_count" in move:
                    print(f"  乗り換え回数: {move['transfer_count']} 回")
            
            # 運賃
            if "fare" in summary:
                fare = summary["fare"]
                if "total" in fare:
                    print(f"  運賃: {fare['total']} 円")
        
        # セクション情報（歩行、電車、バスなど）
        if "sections" in item:
            print(f"  経路詳細:")
            for j, section in enumerate(item["sections"], 1):
                if "walk" in section:
                    walk = section["walk"]
                    if "move" in walk:
                        move = walk["move"]
                        time = move.get("time", 0)
                        distance = move.get("distance", 0)
                        print(f"    [{j}] 徒歩: {time}分 ({distance}m)")
                elif "transit" in section:
                    transit = section["transit"]
                    line_name = transit.get("line", {}).get("name", "N/A")
                    from_station = transit.get("from", {}).get("name", "N/A")
                    to_station = transit.get("to", {}).get("name", "N/A")
                    print(f"    [{j}] {line_name}: {from_station} → {to_station}")

def main():
    """メイン処理"""
    print("RapidAPI Navitime Route TotalNavi API 経路検索テスト")
    print("=" * 50)
    
    # テストケース1: 東京の座標（サンプル）
    # start_lat = 35.665251
    # start_lon = 139.712092
    # goal_lat = 35.661971
    # goal_lon = 139.703795
    
    # テストケース2: 彦根 → 米原（実際の使用例）
    start_lat = 35.2746
    start_lon = 136.2522
    goal_lat = 35.3147
    goal_lon = 136.2908
    
    print(f"\n出発地: ({start_lat}, {start_lon})")
    print(f"到着地: ({goal_lat}, {goal_lon})")
    
    # 経路検索
    result = search_route(start_lat, start_lon, goal_lat, goal_lon)
    
    if result["success"]:
        # 経路サマリーを表示
        display_route_summary(result)
    else:
        print("\n" + "=" * 50)
        print("エラー発生")
        print("=" * 50)
        print(f"ステータスコード: {result.get('status_code', 'N/A')}")
        print(f"エラーメッセージ: {result.get('message', 'N/A')}")
        print(f"エラー詳細: {result.get('error', 'N/A')}")

if __name__ == "__main__":
    main()
