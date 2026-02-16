'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Pause, Square, Activity, Trophy, Home } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useSystemSettings } from '@/lib/hooks/useSystemSettings'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export default function RunningPage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { settings: systemSettings } = useSystemSettings() // システム設定を取得

  // ランニング ウォーキング計測用のステート
  const [isRunning, setIsRunning] = useState(true) // ページアクセス時に自動開始
  const [isPaused, setIsPaused] = useState(false)
  const [isFinished, setIsFinished] = useState(false) // 計測終了フラグ
  const [earnedPoints, setEarnedPoints] = useState(0) // 獲得ポイント
  const [finalDistance, setFinalDistance] = useState(0) // 最終走行距離
  const [pointsAnimation, setPointsAnimation] = useState(false) // ポイントアニメーション用
  const [savingPoints, setSavingPoints] = useState(false) // ポイント保存中フラグ
  const elapsedTime = useRef(0) // 経過時間（秒）- リザルト画面でも使用するためrefに変更
  const [elapsedTimeDisplay, setElapsedTimeDisplay] = useState(0) // 表示用の経過時間
  const [distance, setDistance] = useState(0) // 走行距離（km）
  const [currentPace, setCurrentPace] = useState<number | null>(null) // 現在のペース（min/km）
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null)
  const [gpsPositions, setGpsPositions] = useState<Array<{ lat: number; lng: number; timestamp: number }>>([])
  const runningIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const pausedTimeRef = useRef<number>(0) // 一時停止していた時間の累計（秒）
  const pauseStartTimeRef = useRef<number | null>(null) // 一時停止を開始した時刻
  
  // 地図関連のref
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const currentLocationMarkerRef = useRef<maplibregl.Marker | null>(null)
  const routeSourceRef = useRef<maplibregl.GeoJSONSource | null>(null)

  // 2点間の距離を計算（Haversine formula）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // タイマーをフォーマット（HH:MM:SS）
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // ペースをフォーマット（min/km）
  const formatPace = (pace: number | null): string => {
    if (pace === null || pace === Infinity || isNaN(pace)) return '--:--'
    const minutes = Math.floor(pace)
    const seconds = Math.floor((pace - minutes) * 60)
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  // 地図の初期化（終了後のまとめ画面のみ）
  useEffect(() => {
    // 終了していない場合は地図を初期化しない
    if (!isFinished || !mapContainerRef.current || mapRef.current) return

    console.log('🗺️ [Map] まとめ画面の地図を初期化中...')

    // MapLibre GL JS で地図を初期化
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [136.2522, 35.2746], // 彦根市の中心座標（デフォルト）
      zoom: 15
    })

    map.on('load', () => {
      console.log('✅ [Map] 地図の読み込み完了')
      
      // 走行ルート用のソースとレイヤーを追加
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      })

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.8
        }
      })

      const routeSource = map.getSource('route') as maplibregl.GeoJSONSource
      routeSourceRef.current = routeSource

      // GPS位置データがある場合はルートを描画
      if (gpsPositions.length >= 2) {
        const coordinates = gpsPositions.map(pos => [pos.lng, pos.lat])
        routeSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates
          }
        })

        // 地図の中心をルート全体が見えるように調整
        if (coordinates.length > 0) {
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord as [number, number])
          }, new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]))
          
          map.fitBounds(bounds, {
            padding: 50,
            duration: 1000
          })
        }
      }

      // 地図のリサイズを実行（コンテナサイズが確定した後）
      setTimeout(() => {
        map.resize()
        console.log('✅ [Map] 地図をリサイズしました')
      }, 100)
    })

    mapRef.current = map

    // ウィンドウリサイズ時に地図をリサイズ
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize()
      }
    }
    window.addEventListener('resize', handleResize)

    // クリーンアップ関数
    return () => {
      console.log('🧹 [Map] 地図をクリーンアップ')
      window.removeEventListener('resize', handleResize)
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove()
        currentLocationMarkerRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      routeSourceRef.current = null
    }
  }, [isFinished, gpsPositions])

  // GPS位置が更新されたら地図を更新（まとめ画面のみ）
  useEffect(() => {
    // 終了していない、または地図が初期化されていない場合は何もしない
    if (!isFinished || !mapRef.current || gpsPositions.length === 0) return

    const lastPosition = gpsPositions[gpsPositions.length - 1]
    const { lat, lng } = lastPosition

    // 現在地マーカーを更新
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setLngLat([lng, lat])
    } else {
      // マーカーを作成
      const el = document.createElement('div')
      el.className = 'current-location-marker'
      el.style.width = '20px'
      el.style.height = '20px'
      el.style.borderRadius = '50%'
      el.style.backgroundColor = '#ef4444'
      el.style.border = '3px solid white'
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'

      const marker = new maplibregl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(mapRef.current!)
      
      currentLocationMarkerRef.current = marker
    }

    // 走行ルートを更新
    if (routeSourceRef.current && gpsPositions.length >= 2) {
      const coordinates = gpsPositions.map(pos => [pos.lng, pos.lat])
      routeSourceRef.current.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates
        }
      })

      // ルート全体が見えるように地図を調整
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord as [number, number])
        }, new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]))
        
        mapRef.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        })
      }
    }
  }, [isFinished, gpsPositions])

  // ページマウント時に計測を開始
  useEffect(() => {
    console.log('🚀 [Running] ページマウント: 計測を開始')
    setIsRunning(true)
    setIsPaused(false)
    setIsFinished(false)
    setElapsedTimeDisplay(0)
    elapsedTime.current = 0
    setDistance(0)
    setCurrentPace(null)
    setGpsPositions([])
    pausedTimeRef.current = 0
    startTimeRef.current = Date.now()
    
    // クリーンアップ関数：ページを離れる時にすべてをリセット
    return () => {
      console.log('🧹 [Running] ページアンマウント: 完全クリーンアップ')
      
      // すべてのステートをリセット
      setIsRunning(false)
      setIsPaused(false)
      setIsFinished(false)
      setEarnedPoints(0)
      setFinalDistance(0)
      setPointsAnimation(false)
      setSavingPoints(false)
      setElapsedTimeDisplay(0)
      elapsedTime.current = 0
      setDistance(0)
      setCurrentPace(null)
      setGpsPositions([])
      pausedTimeRef.current = 0
      pauseStartTimeRef.current = null
      startTimeRef.current = null
      
      // GPSとタイマーを完全にクリーンアップ
      if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId)
        setGpsWatchId(null)
      }
      if (runningIntervalRef.current) {
        clearInterval(runningIntervalRef.current)
        runningIntervalRef.current = null
      }
    }
  }, [])

  // GPS計測の開始
  useEffect(() => {
    let simulateInterval: NodeJS.Timeout | null = null
    let errorCount = 0
    const MAX_ERROR_COUNT = 3 // 最大エラー回数
    
    if (isRunning && !isPaused && !isFinished) {
      // GPS位置情報の監視を開始
      if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            // エラーカウントをリセット
            errorCount = 0
            
            const { latitude, longitude } = position.coords
            const timestamp = Date.now()
            
            console.log('📍 [GPS] 位置情報取得:', { latitude, longitude, timestamp })
            
            setGpsPositions(prev => {
              const newPositions = [...prev, { lat: latitude, lng: longitude, timestamp }]
              
              // 距離を計算（最後の2点間の距離を累積）
              if (newPositions.length >= 2) {
                const lastPos = newPositions[newPositions.length - 1]
                const prevPos = newPositions[newPositions.length - 2]
                const segmentDistance = calculateDistance(
                  prevPos.lat, prevPos.lng,
                  lastPos.lat, lastPos.lng
                )
                setDistance(prev => prev + segmentDistance)
              }
              
              return newPositions
            })
          },
          (error: GeolocationPositionError) => {
            errorCount++
            console.error('📍 [GPS] 位置情報取得エラー:', {
              code: error.code,
              message: error.message,
              errorCount
            })
            
            // エラーが多すぎる場合はシミュレーションモードに切り替え
            if (errorCount >= MAX_ERROR_COUNT) {
              console.warn('📍 [GPS] エラーが多すぎるため、シミュレーションモードに切り替えます')
              
              // 既存のwatchを停止
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId)
              }
              
              // シミュレーションモードを開始
              simulateInterval = setInterval(() => {
                const mockLat = 35.2746 + (Math.random() - 0.5) * 0.01
                const mockLng = 136.2522 + (Math.random() - 0.5) * 0.01
                setGpsPositions(prev => {
                  const newPositions = [...prev, { lat: mockLat, lng: mockLng, timestamp: Date.now() }]
                  if (newPositions.length >= 2) {
                    const lastPos = newPositions[newPositions.length - 1]
                    const prevPos = newPositions[newPositions.length - 2]
                    const segmentDistance = calculateDistance(
                      prevPos.lat, prevPos.lng,
                      lastPos.lat, lastPos.lng
                    )
                    setDistance(prev => prev + segmentDistance)
                  }
                  return newPositions
                })
              }, 5000) // 5秒ごとにシミュレーション
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        )
        
        setGpsWatchId(watchId)
        console.log('📍 [GPS] 位置情報監視開始:', watchId)
      } else {
        console.warn('📍 [GPS] 位置情報APIが利用できません - シミュレーションモードを開始')
        // シミュレーションモード
        simulateInterval = setInterval(() => {
          const mockLat = 35.2746 + (Math.random() - 0.5) * 0.01
          const mockLng = 136.2522 + (Math.random() - 0.5) * 0.01
          setGpsPositions(prev => {
            const newPositions = [...prev, { lat: mockLat, lng: mockLng, timestamp: Date.now() }]
            if (newPositions.length >= 2) {
              const lastPos = newPositions[newPositions.length - 1]
              const prevPos = newPositions[newPositions.length - 2]
              const segmentDistance = calculateDistance(
                prevPos.lat, prevPos.lng,
                lastPos.lat, lastPos.lng
              )
              setDistance(prev => prev + segmentDistance)
            }
            return newPositions
          })
        }, 5000) // 5秒ごとにシミュレーション
      }
    }
    
    // クリーンアップ関数：コンポーネントのアンマウント時または条件が変わった時に実行
    return () => {
      console.log('🧹 [GPS] クリーンアップ開始')
      
      // GPS監視を停止
      if (gpsWatchId !== null) {
        try {
          navigator.geolocation.clearWatch(gpsWatchId)
        } catch (err) {
          console.error('📍 [GPS] clearWatchエラー:', err)
        }
        setGpsWatchId(null)
        console.log('📍 [GPS] 位置情報監視停止')
      }
      
      // シミュレーションインターバルを停止
      if (simulateInterval !== null) {
        clearInterval(simulateInterval)
        console.log('📍 [GPS] シミュレーション停止')
      }
    }
  }, [isRunning, isPaused, isFinished])

  // タイマーの更新
  useEffect(() => {
    // タイマーをクリア
    if (runningIntervalRef.current) {
      clearInterval(runningIntervalRef.current)
      runningIntervalRef.current = null
    }
    
    if (isRunning && !isPaused && !isFinished && startTimeRef.current) {
      runningIntervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTimeRef.current! - pausedTimeRef.current * 1000) / 1000)
        elapsedTime.current = elapsed
        setElapsedTimeDisplay(elapsed)
        
        // ペースを計算（距離と時間から）
        if (elapsed > 0 && distance > 0) {
          const pace = (elapsed / 60) / distance // min/km
          setCurrentPace(pace)
        }
      }, 100) // 100msごとに更新
    } else if (isPaused && pauseStartTimeRef.current === null) {
      // 一時停止を開始
      pauseStartTimeRef.current = Date.now()
    } else if (!isPaused && pauseStartTimeRef.current !== null) {
      // 一時停止を解除
      const pauseDuration = (Date.now() - pauseStartTimeRef.current) / 1000
      pausedTimeRef.current += pauseDuration
      pauseStartTimeRef.current = null
    }
    
    // クリーンアップ関数：コンポーネントのアンマウント時または条件が変わった時に実行
    return () => {
      console.log('🧹 [Timer] クリーンアップ開始')
      if (runningIntervalRef.current) {
        clearInterval(runningIntervalRef.current)
        runningIntervalRef.current = null
        console.log('⏱️ [Timer] タイマー停止')
      }
    }
  }, [isRunning, isPaused, isFinished, distance])

  // 一時停止ボタンのハンドラー
  const handlePause = () => {
    if (isPaused) {
      // 再開
      setIsPaused(false)
      if (pauseStartTimeRef.current) {
        const pauseDuration = (Date.now() - pauseStartTimeRef.current) / 1000
        pausedTimeRef.current += pauseDuration
        pauseStartTimeRef.current = null
      }
    } else {
      // 一時停止
      setIsPaused(true)
      pauseStartTimeRef.current = Date.now()
    }
  }

  // ポイントを加算する関数
  const addPointsToUser = async (userId: string, points: number, distance: number) => {
    try {
      setSavingPoints(true)
      
      // 型チェックとログ
      console.log('💰 [Running] ポイント保存開始:', {
        userId,
        userIdType: typeof userId,
        points,
        pointsType: typeof points,
        distance,
        distanceType: typeof distance
      })
      
      // userIdの検証
      if (!userId || typeof userId !== 'string') {
        console.error('💰 [Running] 無効なuserId:', userId)
        return false
      }
      
      // pointsの検証（数値型であることを確認）
      const pointsNumber = Number(points)
      if (isNaN(pointsNumber) || pointsNumber <= 0) {
        console.error('💰 [Running] 無効なポイント数:', points)
        return false
      }
      
      // 1. 現在のポイントを取得
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single()
      
      if (fetchError) {
        console.error('💰 [Running] ポイント取得エラー:', fetchError)
        return false
      }
      
      const currentPoints = currentProfile?.points || 0
      const newPoints = currentPoints + pointsNumber
      
      console.log('💰 [Running] ポイント計算:', {
        currentPoints,
        pointsToAdd: pointsNumber,
        newPoints
      })
      
      // 2. ポイントを更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', userId)
      
      if (updateError) {
        console.error('💰 [Running] ポイント更新エラー:', updateError)
        alert(`ポイント更新エラー: ${updateError.message}`)
        return false
      }
      
      console.log('✅ [Running] ポイント更新成功')
      
      // 3. ポイント履歴に記録（profiles更新の直後に確実に実行）
      console.log('📝 [Running] 履歴保存を開始:', {
        user_id: userId,
        amount: pointsNumber,
        activity_type: 'running',
        earnedPoints: pointsNumber
      })
      
      // ポイント履歴への保存データ構造
      // user_id: UUID, amount: integer, distance: numeric, activity_type: text, description: text, reason: text, created_at: timestamptz
      // 注意: reasonカラムは必須（NULL制約）のため、descriptionと同じ値をセット
      // 将来的にdescriptionに統一予定だが、現在は両方対応
      const historyInsertData = {
        user_id: userId, // UUID型
        amount: pointsNumber, // integer型（獲得したポイント数）
        distance: distance, // numeric型（走行距離 キロメートル）
        activity_type: 'running', // text型（アクティビティタイプ）
        description: 'ランニング', // text型（説明文）
        reason: 'ランニング', // text型（理由 - 必須カラム、descriptionと同じ値をセット）
        created_at: new Date().toISOString() // timestamptz型
      }
      
      console.log('📝 [Running] 保存データ構造:', historyInsertData)
      
      // ポイント履歴への保存を確実に完了するまでawait
      const { data: historyResult, error: historyError } = await supabase
        .from('point_history')
        .insert(historyInsertData)
        .select()
      
      // 履歴保存のエラーハンドリング
      if (historyError) {
        console.error('❌ [Running] 履歴の保存に失敗しました:', historyError.message)
        console.error('❌ [Running] エラー詳細:', {
          code: historyError.code,
          message: historyError.message,
          details: historyError.details,
          hint: historyError.hint,
          fullError: historyError
        })
        
        // ユーザーに分かりやすいエラーメッセージを表示
        let errorMessage = 'ポイント履歴の保存に失敗しました。'
        
        if (historyError.code === 'PGRST204' || historyError.message.includes('PGRST204')) {
          errorMessage = 'データベースのカラムが見つかりません。管理者にお問い合わせください。'
          console.error('❌ [Running] PGRST204エラー: カラムが存在しない可能性があります')
        } else if (historyError.code === '23502') {
          errorMessage = '必須項目が不足しています。管理者にお問い合わせください。'
          console.error('❌ [Running] 23502エラー: NULL制約違反 - reasonカラムが必須です')
        } else if (historyError.code === '23505') {
          errorMessage = 'この履歴は既に保存されています。'
        } else if (historyError.code === '23503') {
          errorMessage = 'ユーザー情報が見つかりません。再度ログインしてください。'
        } else {
          errorMessage = `ポイント履歴の保存に失敗しました。\nエラー: ${historyError.message}`
        }
        
        alert(errorMessage)
        // 履歴保存が失敗した場合はエラーとして扱う
        return false
      } else {
        // 保存成功時のログ
        console.log('✅ [Running] 履歴（レシート）を正常に発行しました')
        
        if (historyResult && historyResult.length > 0) {
          const savedHistory = historyResult[0]
          console.log('✅ [Running] 保存された履歴:', {
            id: savedHistory.id,
            user_id: savedHistory.user_id,
            amount: savedHistory.amount,
            distance: (savedHistory as any).distance,
            activity_type: (savedHistory as any).activity_type,
            description: savedHistory.description,
            reason: (savedHistory as any).reason,
            created_at: savedHistory.created_at
          })
          
          // プロフィール画面で新しい履歴が確実に見れるように、成功をログに記録
          console.log('✅ [Running] プロフィール画面で新しい履歴が表示されるはずです')
        } else {
          console.warn('⚠️ [Running] 履歴保存は成功したが、結果が空です')
        }
      }
      
      // 両方の処理が成功したことを確認
      console.log('✅ ポイントと履歴を両方更新しました')
      console.log(`✅ [Running] ポイント加算成功: +${pointsNumber}pt (合計: ${newPoints}pt)`)
      return true
    } catch (error) {
      console.error('💰 [Running] ポイント加算エラー:', error)
      console.error('💰 [Running] Save Result Exception:', error)
      return false
    } finally {
      setSavingPoints(false)
    }
  }

  // 終了ボタンのハンドラー
  const handleStop = async () => {
    if (confirm('計測を終了しますか？')) {
      // 計測を停止
      setIsRunning(false)
      setIsPaused(false)
      
      // GPSとタイマーを停止
      if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId)
        setGpsWatchId(null)
      }
      if (runningIntervalRef.current) {
        clearInterval(runningIntervalRef.current)
        runningIntervalRef.current = null
      }
      
      // 最終距離を保存
      const finalDist = distance
      setFinalDistance(finalDist)
      
      // 獲得ポイントを計算（system_settingsから取得したbase_point_rateを使用）
      const pointRate = systemSettings?.base_point_rate || 15 // デフォルトは15
      const points = Math.floor(finalDist * pointRate)
      setEarnedPoints(points)
      
      console.log('💰 [Running] ポイント計算:', {
        distance: finalDist,
        pointRate,
        points
      })
      
      // ログイン済みの場合はポイントを加算と履歴保存
      if (authUser && points > 0) {
        console.log('🛑 [Running] 終了処理開始:', {
          userId: authUser.id,
          points,
          distance: finalDist
        })
        
        // ポイント加算処理を実行
        const pointsSaved = await addPointsToUser(authUser.id, points, finalDist)
        
        if (!pointsSaved) {
          console.error('❌ [Running] ポイント保存に失敗しました')
          alert('ポイントの保存に失敗しました。もう一度お試しください。')
          return // 保存に失敗した場合はリザルト画面に遷移しない
        }
        
        // addPointsToUser内で履歴保存も実行されているが、念のため確認ログを出力
        console.log('✅ [Running] ポイントと履歴の保存処理が完了しました')
        console.log('✅ [Running] 保存処理完了 - リザルト画面へ遷移')
      }
      
      // 保存が完了したことを確認してからリザルト画面を表示
      setIsFinished(true)
      
      // ポイントアニメーションを開始（少し遅延させて効果的に）
      setTimeout(() => {
        setPointsAnimation(true)
      }, 300)
    }
  }

  // リザルト画面（まとめ画面 - 地図表示）
  if (isFinished) {
    return (
      <div className="fixed inset-0 z-50">
        {/* 地図コンテナ（背景） */}
        <div 
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full"
          style={{ 
            zIndex: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%'
          }}
        />

        {/* リザルトカード（オーバーレイ） */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pointer-events-none">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20 animate-in zoom-in-95 duration-500 pointer-events-auto">
          {/* お疲れ様メッセージ */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Trophy size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">お疲れ様でした！</h2>
            <p className="text-white/70 font-bold">素晴らしい運動でした</p>
          </div>

          {/* 走行距離 */}
          <div className="bg-white/10 rounded-2xl p-6 mb-4 border border-white/20">
            <p className="text-xs font-bold text-white/60 mb-2 uppercase tracking-wider text-center">走行距離</p>
            <p className="text-4xl font-black text-white text-center tracking-tighter">
              {finalDistance.toFixed(2)}
              <span className="text-xl font-bold text-white/70 ml-1">km</span>
            </p>
          </div>

          {/* 獲得ポイント（アニメーション付き） */}
          <div className={`bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 mb-6 border-2 border-yellow-300 shadow-lg ${
            pointsAnimation ? 'animate-in zoom-in-95 slide-in-from-bottom-4 duration-700' : 'opacity-0 scale-95'
          }`}>
            <p className="text-xs font-black text-yellow-900 mb-2 uppercase tracking-wider text-center">今回の獲得ポイント</p>
            <div className="flex items-center justify-center gap-2">
              <Trophy size={32} className="text-yellow-900" />
              <p className={`text-5xl font-black text-yellow-900 tracking-tighter ${
                pointsAnimation ? 'animate-in zoom-in-95 duration-700 delay-200' : ''
              }`}>
                +{earnedPoints}
                <span className="text-2xl font-bold ml-1">pt</span>
              </p>
            </div>
            {savingPoints && (
              <p className="text-xs font-bold text-yellow-900/70 text-center mt-2">保存中...</p>
            )}
          </div>

          {/* ホームに戻るボタン */}
          <a
            href="/"
            className="w-full py-4 bg-white hover:bg-gray-100 text-gray-900 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
          >
            <Home size={24} />
            ホームに戻る
          </a>
          </div>
        </div>
      </div>
    )
  }

  // デモ走行ボタンのハンドラー（テスト用）
  const handleDemoRun = () => {
    // 距離を +1km 加算
    setDistance(prev => prev + 1.0)
    console.log('🏃 [Running] デモ走行: +1km 加算')
  }

  // 計測画面（黒背景、地図なし）
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* ヘッダー：戻るボタン */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => {
            if (isRunning && confirm('計測を終了して戻りますか？')) {
              handleStop()
            } else {
              // ページを完全に再読み込みしてステートを破棄
              window.location.href = '/'
            }
          }}
          className="p-3 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 transition-colors"
        >
          <ChevronRight size={24} className="rotate-180 text-white" />
        </button>
      </div>

      {/* デモ走行ボタン（テスト用） */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleDemoRun}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-black transition-all active:scale-95 shadow-lg"
        >
          デモ走行（+1km）
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* 上部：デジタルタイマー */}
        <div className="mb-12">
          <p className="text-7xl font-black text-white tracking-tighter font-mono">
            {formatTime(elapsedTimeDisplay)}
          </p>
        </div>

        {/* 中央：走行距離とペース */}
        <div className="flex flex-col items-center gap-8 mb-12">
          {/* 走行距離 */}
          <div className="text-center">
            <p className="text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">走行距離</p>
            <p className="text-5xl font-black text-white tracking-tighter">
              {distance.toFixed(2)}
              <span className="text-2xl font-bold text-white/70 ml-1">km</span>
            </p>
          </div>

          {/* 現在のペース */}
          <div className="text-center">
            <p className="text-xs font-bold text-white/60 mb-2 uppercase tracking-wider">現在のペース</p>
            <p className="text-5xl font-black text-white tracking-tighter">
              {formatPace(currentPace)}
              <span className="text-2xl font-bold text-white/70 ml-1">min/km</span>
            </p>
          </div>
        </div>

        {/* 下部：一時停止と終了ボタン */}
        <div className="flex gap-4 w-full max-w-md">
          {/* 一時停止ボタン */}
          <button
            onClick={handlePause}
            disabled={!isRunning}
            className={`flex-1 py-6 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isPaused
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white border-2 border-white/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Pause size={24} />
            {isPaused ? '再開' : '一時停止'}
          </button>

          {/* 終了ボタン */}
          <button
            onClick={handleStop}
            disabled={!isRunning}
            className="flex-1 py-6 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square size={24} />
            終了
          </button>
        </div>
      </div>
    </div>
  )
}
