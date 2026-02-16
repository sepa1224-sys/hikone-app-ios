#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RapidAPI Navitime Route TotalNavi API 経路検索スクリプト
"""

import requests
import json
from typing import Dict, Any, Optional

# ====== 設定 ======
API_KEY = "457cf9cbadmsh41961ebd0cdbcedp14ffc8jsnbd02f2b02db1"
start_lat = 35.2746
start_lon = 136.2522
goal_lat = 35.3147
goal_lon = 136.2908
start_time = "2026-01-17T14:18:00"  # ISO 8601形式

# ====== API URL ======
# 注意: start/goal は "lat,lon" または "lon,lat" の形式
# APIドキュメントに従って調整してください
url = (
    f"https://navitime-route-totalnavi.p.rapidapi.com/route_transit?"
    f"start={start_lat},{start_lon}&goal={goal_lat},{goal_lon}"
    f"&datum=wgs84&term=1440&limit=5&start_time={start_time}&coord_unit=degree"
)

# ====== ヘッダー ======
headers = {
    "X-RapidAPI-Key": API_KEY,
    "X-RapidAPI-Host": "navitime-route-totalnavi.p.rapidapi.com",
    "Accept": "application/json"
}

# ====== リクエスト送信 ======
print("=" * 50)
print("経路検索リクエスト")
print("=" * 50)
print(f"URL: {url}")
print(f"出発地: ({start_lat}, {start_lon})")
print(f"到着地: ({goal_lat}, {goal_lon})")
print(f"出発時刻: {start_time}")
print("=" * 50)

try:
    response = requests.get(url, headers=headers, timeout=30)
    
    print(f"Response Status: {response.status_code}")
    print("=" * 50)
    
    # ====== 結果表示 ======
    if response.status_code == 200:
        data = response.json()
        print("経路取得成功！")
        print(f"経路数: {len(data.get('items', []))}")
        print("=" * 50)
        
        for idx, item in enumerate(data.get("items", []), 1):
            summary = item.get("summary", {})
            move = summary.get("move", {})
            
            print(f"\n【経路 No.{idx}】")
            print(f"  移動時間: {move.get('time', 'N/A')}分")
            print(f"  距離: {move.get('distance', 'N/A')}m")
            print(f"  乗り換え回数: {move.get('transfer_count', 'N/A')}回")
            
            # 運賃情報
            if "fare" in summary:
                fare = summary["fare"]
                print(f"  運賃: {fare.get('total', 'N/A')}円")
            
            # セクション詳細
            print(f"  経路詳細:")
            for section_idx, section in enumerate(item.get("sections", []), 1):
                section_type = section.get("type", "unknown")
                
                if section_type == "move":
                    # 移動セクション（徒歩など）
                    move_info = section.get("move", {})
                    distance = move_info.get("distance", "不明")
                    time = move_info.get("time", "不明")
                    move_type = "徒歩" if move_info.get("transport_type") == "walk" else "移動"
                    print(f"    [{section_idx}] {move_type} | 距離: {distance}m | 時間: {time}分")
                    
                elif section_type == "transit":
                    # 公共交通機関セクション（電車、バスなど）
                    transit = section.get("transit", {})
                    line = transit.get("line", {})
                    line_name = line.get("name", "不明")
                    from_station = transit.get("from", {}).get("name", "不明")
                    to_station = transit.get("to", {}).get("name", "不明")
                    time = transit.get("time", "不明")
                    distance = transit.get("distance", "不明")
                    print(f"    [{section_idx}] {line_name} | {from_station} → {to_station} | 時間: {time}分 | 距離: {distance}m")
                
                else:
                    # その他のセクションタイプ
                    print(f"    [{section_idx}] タイプ: {section_type}")
                    print(f"        データ: {json.dumps(section, indent=8, ensure_ascii=False)}")
        
        print("\n" + "=" * 50)
        print("✓ 処理完了")
        print("=" * 50)
        
    else:
        print(f"エラー発生: {response.status_code}")
        print(f"エラーレスポンス:")
        print(response.text)
        
        # JSONとして解析を試みる
        try:
            error_json = response.json()
            print(f"\nエラーJSON:")
            print(json.dumps(error_json, indent=2, ensure_ascii=False))
        except:
            pass
            
except requests.exceptions.RequestException as e:
    print(f"リクエストエラー: {e}")
except Exception as e:
    print(f"予期しないエラー: {e}")
    import traceback
    traceback.print_exc()
