import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 駅すぱあと API を使用した乗り換え検索
 * search/course/light エンドポイントを使用（フリープラン対応）
 */

// 駅すぱあと API のベースURL
const EKISPERT_API_BASE_URL = 'https://api.ekispert.jp/v1'

/**
 * Supabaseクライアントを取得（サーバーサイド用）
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase環境変数が設定されていません')
    return null
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

// 座標変換処理はすべて削除しました
// 入力した駅名をそのまま駅すぱあとに投げるシンプルな実装です

/**
 * APIキーを取得（確実に読み込む）
 */
function getApiKey(): string {
  // Next.jsでは、サーバーサイドでは process.env から直接読み込める
  const apiKey = process.env.EKISPERT_API_KEY
  
  // 使用中のキーの先頭5文字を確認（環境変数の変更が反映されているか確認）
  console.log('🔑 [APIキー確認] 使用中のキーの先頭5文字:', apiKey ? apiKey.substring(0, 5) : '未設定')
  console.log('🔑 [APIキー確認] EKISPERT_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}... (長さ: ${apiKey.length})` : '未設定')
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('❌ EKISPERT_API_KEY が設定されていません')
    console.error('   .env.local に EKISPERT_API_KEY=test_CPkgEgfmabv を設定してください')
    throw new Error('EKISPERT_API_KEY が設定されていません')
  }
  
  // キーが正しく読み込まれているか確認（先頭が「test_」で始まっているか）
  const trimmedKey = apiKey.trim()
  if (!trimmedKey.startsWith('test_')) {
    console.warn('⚠️ APIキーの先頭が「test_」で始まっていません。環境変数が正しく読み込まれていない可能性があります。')
    console.warn('   現在のキー:', trimmedKey.substring(0, 20) + '...')
    console.warn('   サーバーを再起動してください（Ctrl+C で停止 → npm run dev で再起動）')
  }
  
  return trimmedKey
}

/**
 * 同名駅の補完ロジック
 * 同名駅が存在する可能性のある駅名に都道府県名を自動付与
 */
function normalizeStationName(stationName: string): string {
  const name = stationName.trim()
  
  // 同名駅が存在する可能性のある駅名リスト
  const ambiguousStations: Record<string, string> = {
    '草津': '草津(滋賀)',
    '草津駅': '草津(滋賀)',
    // 必要に応じて他の同名駅も追加可能
  }
  
  // 既に都道府県名が含まれている場合はそのまま返す
  if (name.includes('(') && name.includes(')')) {
    return name
  }
  
  // 同名駅リストに該当する場合は補完
  if (ambiguousStations[name]) {
    console.log(`   📝 駅名を補完: "${name}" → "${ambiguousStations[name]}"`)
    return ambiguousStations[name]
  }
  
  return name
}

/**
 * 駅すぱあと API で経路検索を実行
 * パラメータ: key, from, to, date, time, searchType, transitOptions をセット
 */
async function searchRouteWithEkispert(
  fromStation: string | number,
  toStation: string | number,
  dateParam?: string,
  timeParam?: string,
  searchTypeParam?: string,
  transitOptionsParam?: any
) {
  const apiKey = getApiKey()
  
  // 日時・時刻の取得（フロントエンドから送られてきた値を優先的に使用）
  let date: string
  let time: string
  
  if (dateParam && dateParam.trim()) {
    // パラメータから受け取った日付を使用（YYYYMMDD形式）
    date = dateParam.trim()
    console.log('   ✅ [API] 日付パラメータを受け取りました:', date)
  } else {
    // フォールバック: 現在の日時を取得（通常は実行されないはず）
    console.warn('   ⚠️ [API] 日付パラメータが空のため、現在の日付を使用します')
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    date = `${year}${month}${day}`
  }
  
  if (timeParam && timeParam.trim()) {
    // パラメータから受け取った時刻を使用（HHMM形式）
    time = timeParam.trim()
    console.log('   ✅ [API] 時刻パラメータを受け取りました:', time)
  } else {
    // フォールバック: 現在の時刻を取得（通常は実行されないはず）
    console.warn('   ⚠️ [API] 時刻パラメータが空のため、現在の時刻を使用します')
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    time = `${hours}${minutes}`
  }
  
  console.log('   📅 [API] 駅すぱあとAPIに送信する日時:', `date=${date}, time=${time}`)
  
  // APIキーの確認（念のため再確認）
  console.log('   🔑 [APIキー再確認] 使用中のキーの先頭5文字:', apiKey ? apiKey.substring(0, 5) : '未設定')
  console.log('   🔑 [APIキー再確認] EKISPERT_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}... (長さ: ${apiKey.length}, 末尾: ...${apiKey.substring(apiKey.length - 4)})` : '未設定 ❌')
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('EKISPERT_API_KEY が設定されていません')
  }
  
  // キーが正しく読み込まれているか確認
  if (!apiKey.startsWith('test_')) {
    console.error('   ❌ APIキーの先頭が「test_」で始まっていません！')
    console.error('      現在のキー:', apiKey.substring(0, 20) + '...')
    console.error('      サーバーを再起動してください（Ctrl+C で停止 → npm run dev で再起動）')
  }
  
  // パラメータを構築（極限までシンプルに）
  // search/course/light では from と to パラメータを使用（API仕様に合わせる）
  let fromStr = String(fromStation).trim()
  let toStr = String(toStation).trim()
  
  // 同名駅の補完を適用
  fromStr = normalizeStationName(fromStr)
  toStr = normalizeStationName(toStr)
  
  // encodeURIComponent を徹底的に使用して駅名の漢字を安全に変換
  // これが403エラーを防ぐ重要なポイント
  const encodedFrom = encodeURIComponent(fromStr)
  const encodedTo = encodeURIComponent(toStr)
  
  // URLを直接構築（最小構成：key, from, to, date, time のみ）
  // from と to を使用（API仕様に合わせる）
  const finalUrl = `https://api.ekispert.jp/v1/json/search/course/light?key=${apiKey}&from=${encodedFrom}&to=${encodedTo}&date=${date}&time=${time}`
  
  // fetch直前に最終リクエストURLをログ出力（重要: 実際にAPIに送られるURL）
  console.log('')
  console.log('🚃 [駅すぱあと API] ========================================')
  console.log('🚃 [駅すぱあと API] 最終リクエストURL（実際に送信されるURL）:')
  console.log('🚃 [駅すぱあと API] ========================================')
  console.log(finalUrl.replace(apiKey, 'KEY_HIDDEN'))
  console.log('')
  console.log('   📋 パラメータ詳細確認:')
  console.log('      - key:', apiKey ? `設定済み ✓ (${apiKey.substring(0, 10)}..., 末尾: ...${apiKey.substring(apiKey.length - 4)})` : '未設定 ❌')
  console.log('      - from:', encodedFrom, '(encodeURIComponent適用済み)')
  console.log('      - to:', encodedTo, '(encodeURIComponent適用済み)')
  console.log('         - 元の値:', `from=${fromStr}, to=${toStr}`)
  console.log('         - エンコード後:', `from=${encodedFrom}, to=${encodedTo}`)
      console.log('      - date:', date, date ? `(YYYYMMDD形式${date.length === 8 ? ' ✓' : ' ❌ 不正な形式'})` : '(未指定 ❌)')
      console.log('      - time:', time, time ? `(HHMM形式${time.length === 4 ? ' ✓' : ' ❌ 不正な形式'})` : '(未指定 ❌)')
      console.log('      - エンドポイント: search/course/light (フリープラン対応)')
      console.log('      - パラメータ構成: 極限までシンプル（key, from, to, date, time のみ）')
      console.log('🚃 [駅すぱあと API] ========================================')
      console.log('')
      
      try {
        // fetchを極限までシンプルに（headersを削除）
        // from と to パラメータを使用（light版APIの仕様）
        const response = await fetch(finalUrl)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [駅すぱあと API] 経路検索 (light) エラー:')
      console.error('   ステータス:', response.status, response.statusText)
      console.error('   エラー内容（全文）:', errorText)
      console.error('   リクエストURL:', finalUrl.replace(apiKey, 'KEY_HIDDEN'))
      
      // 403エラーの場合、詳細な情報を出力
      if (response.status === 403) {
        console.error('   ⚠️ 403 Forbidden エラーが発生しました')
        console.error('   詳細:', errorText)
        console.error('   🔑 APIキー確認:')
        console.error('      - キーの長さ:', apiKey.length)
        console.error('      - キーの先頭:', apiKey.substring(0, 10))
        console.error('      - キーの末尾:', apiKey.substring(apiKey.length - 4))
        console.error('      - キーが空でないか:', apiKey.trim() !== '' ? '✓' : '❌')
        console.error('   📋 リクエストパラメータ:')
        console.error('      - from:', fromStr)
        console.error('      - to:', toStr)
        console.error('      - date:', date)
        console.error('      - time:', time)
        console.error('      - encodedFrom:', encodedFrom)
        console.error('      - encodedTo:', encodedTo)
      }
      
      // 400エラーの場合も詳細を出力
      if (response.status === 400) {
        console.error('   ⚠️ 400 Bad Request エラーが発生しました')
        console.error('   詳細:', errorText)
        console.error('   📋 リクエストパラメータ:')
        console.error('      - from:', fromStr, '(エンコード後:', encodedFrom, ')')
        console.error('      - to:', toStr, '(エンコード後:', encodedTo, ')')
        console.error('      - date:', date)
        console.error('      - time:', time)
      }
      
      // E102エラー（駅名が見つからない）の場合の特別処理
      // APIから返ってきたエラーメッセージをそのまま使用
      if (errorText.includes('E102') || errorText.includes('駅名が見つかりません')) {
        // エラーメッセージをそのまま返す（JSON形式の場合はパースしてメッセージを抽出）
        let errorMessage = '駅名が見つかりませんでした'
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.ResultSet?.Error?.Message) {
            errorMessage = errorJson.ResultSet.Error.Message
          } else if (errorJson.message) {
            errorMessage = errorJson.message
          }
        } catch {
          // JSONでない場合は、エラーテキストからメッセージを抽出
          const messageMatch = errorText.match(/駅名が見つかりません[。.]?[^(]*\(([^)]+)\)/)
          if (messageMatch) {
            errorMessage = `駅名「${messageMatch[1]}」が見つかりませんでした`
          } else {
            errorMessage = errorText || '駅名が見つかりませんでした'
          }
        }
        
        // 同名駅の可能性がある場合のヒントを追加
        const stationName = fromStr || toStr
        if (stationName && !stationName.includes('(') && !stationName.includes(')')) {
          errorMessage += '。同名駅が存在する場合は「駅名(都道府県)」の形式で入力してください（例：草津(滋賀)）'
        }
        
        throw new Error(`STATION_NOT_FOUND:${errorMessage}`)
      }
      
      throw new Error(`駅すぱあと API エラー: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('✅ [駅すぱあと API] レスポンス取得成功')
    
    // ResultSet の中身を詳しく出力
    if (data.ResultSet) {
      console.log('📦 ResultSet の詳細構造:')
      console.dir(data.ResultSet, { depth: null })
      
      // light版APIはResourceURIを返す可能性がある
      if (data.ResultSet.ResourceURI) {
        console.log('   🔗 ResourceURI が見つかりました（light版APIの仕様）')
        console.log('   ResourceURI:', data.ResultSet.ResourceURI)
        // ResourceURIをそのまま返す（フロントエンドで処理）
        return {
          ...data,
          hasResourceURI: true,
          resourceURI: data.ResultSet.ResourceURI
        }
      }
      
      // Course の有無を確認
      if (data.ResultSet.Course) {
        const courseArray = Array.isArray(data.ResultSet.Course) ? data.ResultSet.Course : [data.ResultSet.Course]
        console.log(`   📊 Course数: ${courseArray.length}件`)
        if (courseArray.length > 0) {
          console.log('   📋 最初のCourse詳細:')
          console.dir(courseArray[0], { depth: 3 })
        } else {
          console.warn('   ⚠️ Course が空です')
        }
      } else {
        console.warn('   ⚠️ Course プロパティが見つかりません（ResourceURIも確認してください）')
      }
    } else {
      console.warn('   ⚠️ ResultSet が見つかりません')
      console.dir(data, { depth: 2 })
    }
    
    return data
  } catch (error: any) {
    console.error('❌ [駅すぱあと API] エラー:', error.message)
    throw error
  }
}

// 座標変換処理（geo/stationなど）はすべて削除しました

/**
 * 駅すぱあと API のレスポンスをアプリケーション用の形式に変換
 * レスポンス構造: data.ResultSet.Course[] または data.ResultSet.ResourceURI (light版)
 */
function transformEkispertResponse(apiData: any, fromStation: string, toStation: string) {
  // 安全に ResultSet を取得
  if (!apiData || !apiData.ResultSet) {
    console.warn('⚠️ ResultSet が見つかりません')
    return []
  }
  
  // light版API: ResourceURIが返ってきた場合
  if (apiData.hasResourceURI && apiData.resourceURI) {
    console.log('🔗 ResourceURI形式のレスポンスを検出しました')
    return [{
      type: 'resourceURI',
      resourceURI: apiData.resourceURI,
      summary: {
        start_time: Date.now(),
        arrival_time: Date.now(),
        move: {
          time: 0,
          distance: 0,
          transfer_count: 0,
        },
        fare: {
          total: 0,
        },
      },
      sections: [],
    }]
  }
  
  // 通常版API: Courseが返ってきた場合
  const courses = apiData.ResultSet.Course
  if (!courses) {
    console.warn('⚠️ Course が見つかりません（ResourceURIも確認してください）')
    // ResourceURIを確認
    if (apiData.ResultSet.ResourceURI) {
      console.log('   🔗 ResourceURI が見つかりました:', apiData.ResultSet.ResourceURI)
      return [{
        type: 'resourceURI',
        resourceURI: apiData.ResultSet.ResourceURI,
        summary: {
          start_time: Date.now(),
          arrival_time: Date.now(),
          move: {
            time: 0,
            distance: 0,
            transfer_count: 0,
          },
          fare: {
            total: 0,
          },
        },
        sections: [],
      }]
    }
    return []
  }
  
  // Course が配列でない場合は配列に変換
  const courseArray = Array.isArray(courses) ? courses : [courses]
  
  console.log('📦 変換前のCourse数:', courseArray.length)
  
  const transformed = courseArray.map((course: any, index: number) => {
    // 1. 運賃の取得: course.Price 配列から kind: 'FareSummary' を探す
    let totalFare = 0
    if (course.Price && Array.isArray(course.Price)) {
      const fareSummary = course.Price.find((p: any) => p.kind === 'FareSummary')
      if (fareSummary && fareSummary.Oneway) {
        totalFare = parseInt(String(fareSummary.Oneway), 10) || 0
      }
      
      // 特急料金を含める場合は ChargeSummary の Oneway も足す
      const chargeSummary = course.Price.find((p: any) => p.kind === 'ChargeSummary')
      if (chargeSummary && chargeSummary.Oneway) {
        totalFare += parseInt(String(chargeSummary.Oneway), 10) || 0
      }
    }
    
    // 2. 所要時間の計算: course.Route.timeOnBoard + course.Route.timeOther
    let durationMinutes = 0
    if (course.Route) {
      const timeOnBoard = parseInt(String(course.Route.timeOnBoard || 0), 10) || 0
      const timeOther = parseInt(String(course.Route.timeOther || 0), 10) || 0
      durationMinutes = timeOnBoard + timeOther
    }
    
    // 3. 出発・到着時間の取得: course.Route.Line 配列から取得
    // 重要: Route.Line は配列の場合と単体オブジェクトの場合があるため、正規化が必要
    let departureTime = ''
    let arrivalTime = ''
    
    // Route.Line を配列として正規化
    let linesArray: any[] = []
    if (course.Route && course.Route.Line) {
      linesArray = Array.isArray(course.Route.Line) ? course.Route.Line : [course.Route.Line]
    }
    
    if (linesArray.length > 0) {
      // 最初の要素の DepartureState.Datetime.text が出発時間
      const firstLine = linesArray[0]
      if (firstLine.DepartureState && firstLine.DepartureState.Datetime && firstLine.DepartureState.Datetime.text) {
        departureTime = firstLine.DepartureState.Datetime.text
      }
      
      // 最後の要素の ArrivalState.Datetime.text が到着時間
      const lastLine = linesArray[linesArray.length - 1]
      if (lastLine.ArrivalState && lastLine.ArrivalState.Datetime && lastLine.ArrivalState.Datetime.text) {
        arrivalTime = lastLine.ArrivalState.Datetime.text
      }
    }
    
    // 乗り換え回数: Route.Line の数 - 1
    const transferCount = Math.max(0, linesArray.length - 1)
    
    // 各区間の情報を抽出: course.Route.Line から取得
    const sections: any[] = []
    
    linesArray.forEach((line: any, lineIndex: number) => {
        // 路線名を取得
        const lineName = line.Line?.Name || line.Line?.name || line.line?.Name || line.line?.name || '路線名不明'
        
        // 列車種別を取得（新快速、快速など）
        const trainType = line.Type?.Name || line.Type?.name || line.type?.Name || line.type?.name || line.Kind?.Name || line.kind?.Name || ''
        
        // プラットフォーム（番線）情報
        const platform = line.DepartureState?.Platform?.Name || line.DepartureState?.Platform?.name || line.DepartureState?.platform?.Name || ''
        
        // 出発駅・到着駅
        const from = line.DepartureState?.Station?.Name || line.DepartureState?.Station?.name || line.DepartureState?.station?.Name || ''
        const to = line.ArrivalState?.Station?.Name || line.ArrivalState?.Station?.name || line.ArrivalState?.station?.Name || ''
        
        // 出発・到着時刻
        const depTime = line.DepartureState?.Datetime?.text || ''
        const arrTime = line.ArrivalState?.Datetime?.text || ''
        
        sections.push({
          type: 'transit',
          transit: {
            line: {
              name: lineName,
              trainType: trainType,
            },
            from: {
              name: from,
              platform: platform,
            },
            to: {
              name: to,
            },
            departureTime: depTime,
            arrivalTime: arrTime,
          },
          walk: null,
        })
      })
    
    // 時刻をDateオブジェクトに変換
    // departureTime と arrivalTime は "YYYY-MM-DDTHH:mm:ss" 形式または "HH:mm" 形式の可能性がある
    const now = new Date()
    let depDate = new Date(now)
    let arrDate = new Date(now)
    
    if (departureTime) {
      // ISO形式（YYYY-MM-DDTHH:mm:ss）の場合
      if (departureTime.includes('T')) {
        depDate = new Date(departureTime)
      } else {
        // HH:mm形式の場合
        const [depHour, depMin] = departureTime.split(':').map(Number)
        if (!isNaN(depHour) && !isNaN(depMin)) {
          depDate.setHours(depHour, depMin, 0, 0)
        }
      }
    }
    
    if (arrivalTime) {
      // ISO形式（YYYY-MM-DDTHH:mm:ss）の場合
      if (arrivalTime.includes('T')) {
        arrDate = new Date(arrivalTime)
      } else {
        // HH:mm形式の場合
        const [arrHour, arrMin] = arrivalTime.split(':').map(Number)
        if (!isNaN(arrHour) && !isNaN(arrMin)) {
          arrDate.setHours(arrHour, arrMin, 0, 0)
          // 到着時刻が出発時刻より前の場合は翌日
          if (arrDate < depDate) {
            arrDate.setDate(arrDate.getDate() + 1)
          }
        }
      }
    }
    
    // 4. バリデーション: 数値が正しく変換されているか確認
    if (isNaN(durationMinutes) || durationMinutes < 0) {
      console.warn(`⚠️ 所要時間が不正な値です: ${durationMinutes}`)
      durationMinutes = 0
    }
    if (isNaN(totalFare) || totalFare < 0) {
      console.warn(`⚠️ 運賃が不正な値です: ${totalFare}`)
      totalFare = 0
    }
    
    return {
      summary: {
        start_time: depDate.getTime(),
        arrival_time: arrDate.getTime(),
        move: {
          time: durationMinutes, // 分単位
          distance: 0,
          transfer_count: transferCount,
        },
        fare: {
          total: totalFare, // 円単位
        },
      },
      sections: sections,
      trainType: course.TrainType || course.trainType || '',
      platform: course.Platform || course.platform || '',
    }
  })
  
  // 変換後のデータをログ出力（最初の1件のみ）
  if (transformed.length > 0) {
    console.log('✅ 変換後のデータ（最初の1件）:')
    console.log('   - 所要時間:', transformed[0].summary.move.time, '分')
    console.log('   - 運賃:', transformed[0].summary.fare.total, '円')
    console.log('   - 乗り換え回数:', transformed[0].summary.move.transfer_count, '回')
    console.log('   - 経路詳細数:', transformed[0].sections.length, '区間')
    console.log('   - 出発時刻:', transformed[0].summary.start_time ? new Date(transformed[0].summary.start_time).toLocaleString('ja-JP') : 'なし')
    console.log('   - 到着時刻:', transformed[0].summary.arrival_time ? new Date(transformed[0].summary.arrival_time).toLocaleString('ja-JP') : 'なし')
  }
  
  return transformed
}

/**
 * GET リクエストハンドラ
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  console.log('')
  console.log('========================================')
  console.log('🚃 乗り換え検索API (駅すぱあと)')
  console.log('========================================')
  
  // APIキーの確認（最初に確認）
  try {
    const apiKey = getApiKey()
    console.log('✅ APIキー読み込み成功')
    console.log('   使用中のキーの先頭5文字:', apiKey.substring(0, 5))
    
    // キーが正しく読み込まれているか確認
    if (!apiKey.startsWith('test_')) {
      console.warn('⚠️ 警告: APIキーの先頭が「test_」で始まっていません')
      console.warn('   サーバーを再起動してください（Ctrl+C で停止 → npm run dev で再起動）')
    }
  } catch (error: any) {
    console.error('❌ APIキー読み込み失敗:', error.message)
    return NextResponse.json({
      routes: [],
      error: 'API_KEY_MISSING',
      message: 'APIキーが設定されていません。.env.local に EKISPERT_API_KEY を設定してください。',
    }, { status: 500 })
  }
  
  // クエリから from と to を受け取る（駅名または駅コード）
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  
  // クエリから date と time を受け取る（必須）
  const date = searchParams.get('date') || ''
  const time = searchParams.get('time') || ''
  
  // クエリから searchType と transitOptions を受け取る（オプション）
  const searchType = searchParams.get('searchType') || 'departure'
  const transitOptionsStr = searchParams.get('transitOptions') || '{}'
  
  let transitOptions: any = {}
  try {
    transitOptions = JSON.parse(transitOptionsStr)
  } catch {
    // JSONパースに失敗した場合はデフォルト値を使用
    transitOptions = {
      shinkansen: true,
      limitedExpress: true,
      expressBus: true,
      localBus: true,
      ferry: true,
    }
  }
  
  console.log('📍 [API] 受け取ったパラメータ:')
  console.log('   - from:', from, from.match(/^\d+$/) ? '(駅コード)' : '(駅名)')
  console.log('   - to:', to, to.match(/^\d+$/) ? '(駅コード)' : '(駅名)')
  console.log('   - date:', date || '(未指定)', date ? `(形式: ${date.length === 8 ? 'YYYYMMDD ✓' : '不正'})` : '')
  console.log('   - time:', time || '(未指定)', time ? `(形式: ${time.length === 4 ? 'HHMM ✓' : '不正'})` : '')
  console.log('   - searchType:', searchType)
  console.log('   - transitOptions:', transitOptions)
  
  // バリデーション
  if (!from || !to) {
    console.error('❌ パラメータ不足: from または to が空です')
    return NextResponse.json({
      routes: [],
      error: 'INVALID_PARAMS',
      message: '出発駅と到着駅を指定してください',
    }, { status: 400 })
  }
  
  try {
    // 入力した文字をそのまま駅すぱあとに投げる（日時・時刻、検索タイプ、交通手段オプションも含む）
    const apiData = await searchRouteWithEkispert(from, to, date, time, searchType, transitOptions)
    
    // レスポンスを変換
    const routes = transformEkispertResponse(apiData, from, to)
    
    if (routes.length === 0) {
      return NextResponse.json({
        routes: [],
        message: '経路が見つかりませんでした',
      })
    }
    
    console.log('✅ 経路取得成功:', routes.length, '件')
    return NextResponse.json({
      routes,
      message: '検索が完了しました',
    })
    
  } catch (error: any) {
    console.error('❌ 乗り換え検索エラー:', error)
    
    // エラーメッセージを判定
    let errorMessage = '経路検索に失敗しました'
    let errorCode = 'UNKNOWN_ERROR'
    
    if (error.message.includes('駅名が見つかりません') || error.message.includes('STATION_NOT_FOUND')) {
      // STATION_NOT_FOUND: の後のメッセージを抽出
      if (error.message.includes('STATION_NOT_FOUND:')) {
        errorMessage = error.message.split('STATION_NOT_FOUND:')[1] || '駅名が見つかりませんでした'
      } else {
        errorMessage = error.message
      }
      errorCode = 'STATION_NOT_FOUND'
    } else if (error.message.includes('EKISPERT_API_KEY') || error.message.includes('APIキーが設定されていません')) {
      errorMessage = 'APIキーが設定されていません。.env.local に EKISPERT_API_KEY=test_CPkgEgfmabv を設定してください。'
      errorCode = 'API_KEY_MISSING'
    } else if (error.message.includes('API エラー') || error.message.includes('駅すぱあと API') || error.message.includes('403')) {
      // 403エラーやその他のAPIエラーの場合、DBキャッシュをフォールバックとして試す
      console.log('🔄 APIエラーが発生したため、DBキャッシュをフォールバックとして検索します...')
      
      try {
        const supabase = getSupabaseClient()
        if (supabase && date && time) {
          const formattedDate = date.replace(/-/g, '') // 念のため変換
          const formattedTime = time.replace(/:/g, '') // 念のため変換
          
          const { data: cachedData, error: cacheError } = await supabase
            .from('train_routes')
            .select('*')
            .eq('departure_station', from)
            .eq('arrival_station', to)
            .eq('search_date', formattedDate)
            .eq('search_time', formattedTime)
            .gt('valid_until', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
          
          if (!cacheError && cachedData && cachedData.length > 0) {
            console.log('✅ フォールバック: DBキャッシュから経路を取得しました')
            const cached = cachedData[0]
            
            // route_data を復元
            const routeData = typeof cached.route_data === 'string' 
              ? JSON.parse(cached.route_data) 
              : cached.route_data
            
            if (routeData && routeData.length > 0) {
              return NextResponse.json({
                routes: routeData,
                message: '検索が完了しました（キャッシュから取得）',
                fromCache: true,
              })
            }
          } else {
            console.log('📭 フォールバック: DBキャッシュが見つかりませんでした')
          }
        }
      } catch (fallbackError: any) {
        console.error('❌ フォールバック処理でもエラーが発生しました:', fallbackError)
      }
      
      errorMessage = `駅すぱあと API でエラーが発生しました: ${error.message}`
      errorCode = 'API_ERROR'
    } else {
      // その他のエラーも詳細を表示
      errorMessage = `${error.message || '経路検索に失敗しました'}`
    }
    
    return NextResponse.json({
      routes: [],
      error: errorCode,
      message: errorMessage,
    }, { status: 500 })
  }
}
