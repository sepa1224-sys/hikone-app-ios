import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-static';

import { 
  getStationTimetable as getGTFSTimetable, 
  getNextTrains as getGTFSNextTrains 
} from '@/lib/gtfsParser'
import { getStationTimetable, getNextTrains, type StationTimetableParams } from '@/lib/transportApi'

/**
 * 駅時刻表を取得するAPI Route
 * 
 * GTFSデータを優先的に使用し、取得できない場合はODPT APIにフォールバック
 * 
 * @example
 * GET /api/timetable?stationName=彦根
 * GET /api/timetable?station=odpt.Station:JR-West.Tokaido.Hikone&operator=odpt.Operator:JR-West
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // パラメータを取得
    const stationName = searchParams.get('stationName') // GTFS用（駅名）
    const station = searchParams.get('station') // ODPT用（駅ID）
    const operator = searchParams.get('operator')
    
    // GTFSデータを優先的に使用
    if (stationName) {
      console.log('🚃 [Timetable API] GTFSデータを使用:', stationName)
      
      const timetable = await getGTFSTimetable(stationName)
      
      if (!timetable) {
        console.warn(`⚠️ [Timetable API] GTFSデータが見つかりません: ${stationName}`)
        
        // ODPT APIにフォールバック
        return await fallbackToODPT(searchParams)
      }
      
      const nextTrains = getGTFSNextTrains(timetable, 10)
      
      return NextResponse.json({
        success: true,
        timetables: [{
          stationId: timetable.stationId,
          stationName: timetable.stationName,
          operator: '滋賀県公共交通',
          operatorId: 'shiga-transport',
          railway: '',
          direction: '',
          calendar: '',
          nextTrains: nextTrains.map(train => ({
            departureTime: train.departureTime,
            arrivalTime: train.arrivalTime,
            trainNumber: train.tripId,
            trainType: null,
            destinationStation: [train.destination],
            viaStation: null,
            viaRailway: null,
            trainName: train.routeName,
            trainOwner: null,
            minutesUntilDeparture: train.departureTime ? calculateMinutesUntilDeparture(train.departureTime) : null
          }))
        }]
      })
    }
    
    // ODPT APIを使用
    return await fallbackToODPT(searchParams)
    
  } catch (error: any) {
    console.error('❌ [Timetable API] エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || '時刻表の取得に失敗しました',
      timetables: []
    }, { status: 500 })
  }
}

/**
 * ODPT APIにフォールバック
 */
async function fallbackToODPT(searchParams: URLSearchParams) {
  const station = searchParams.get('station')
  const operator = searchParams.get('operator')
  const railway = searchParams.get('railway')
  const railDirection = searchParams.get('railDirection')
  const calendar = searchParams.get('calendar')
  
  // パラメータを構築
  const params: StationTimetableParams = {}
  
  if (operator) {
    const operators = operator.split(',').map(op => op.trim())
    params.operator = operators.length === 1 ? operators[0] as any : operators as any[]
  }
  
  if (station) {
    params.station = station
  }
  
  if (railway) {
    params.railway = railway
  }
  
  if (railDirection) {
    params.railDirection = railDirection
  }
  
  if (calendar) {
    params.calendar = calendar
  } else {
    const now = new Date()
    const dayOfWeek = now.getDay()
    
    if (dayOfWeek === 0) {
      params.calendar = 'odpt.Calendar:Holiday'
    } else if (dayOfWeek === 6) {
      params.calendar = 'odpt.Calendar:Saturday'
    } else {
      params.calendar = 'odpt.Calendar:Weekday'
    }
  }
  
  console.log('🚃 [Timetable API] ODPT APIを使用:', params)
  
  const timetables = await getStationTimetable(params)
  
  if (!timetables || timetables.length === 0) {
    const stationId = params.station || '未指定'
    console.warn(`⚠️ [Timetable API] ID: ${stationId} のデータが見つかりません。IDが間違っている可能性があります`)
    console.warn(`   リクエストパラメータ:`, params)
    
    return NextResponse.json({
      success: false,
      message: '時刻表が見つかりませんでした',
      timetables: []
    })
  }
  
  // 各時刻表から次の列車を取得
  const result = timetables.map(timetable => {
    const nextTrains = getNextTrains(timetable, 10) // 次の10本を取得
    
    return {
      stationId: timetable.stationId,
      stationName: timetable.stationName,
      operator: timetable.operator,
      operatorId: timetable.operatorId,
      railway: timetable.railway,
      direction: timetable.direction,
      calendar: timetable.calendar,
      nextTrains: nextTrains.map(train => ({
        departureTime: train.departureTime,
        arrivalTime: train.arrivalTime,
        trainNumber: train.trainNumber,
        trainType: train.trainType,
        destinationStation: train.destinationStation,
        viaStation: train.viaStation,
        viaRailway: train.viaRailway,
        trainName: train.trainName,
        trainOwner: train.trainOwner,
        minutesUntilDeparture: train.departureTime ? calculateMinutesUntilDeparture(train.departureTime) : null
      }))
    }
  })
  
  return NextResponse.json({
    success: true,
    timetables: result
  })
}

/**
 * 出発時刻までの残り分数を計算
 * @param departureTime "HH:MM" 形式の時刻文字列
 * @returns 残り分数（分）
 */
function calculateMinutesUntilDeparture(departureTime: string): number | null {
  try {
    const [hours, minutes] = departureTime.split(':').map(Number)
    const now = new Date()
    const departure = new Date()
    departure.setHours(hours, minutes, 0, 0)
    
    // 出発時刻が今日の時刻より前の場合は、翌日として扱う
    if (departure < now) {
      departure.setDate(departure.getDate() + 1)
    }
    
    const diffMs = departure.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    return diffMinutes >= 0 ? diffMinutes : null
  } catch {
    return null
  }
}
