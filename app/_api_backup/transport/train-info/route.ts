import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const start_id = searchParams.get('start_id')
  const goal_id = searchParams.get('goal_id')
  const start_time = searchParams.get('start_time')
  const key = process.env.GOOGLE_MAPS_API_KEY

  // 1. 【超重要】時間を「人間用」から「Google用（数字）」に変換
  let unixTimestamp: number;
  if (start_time) {
    // 日本時間を考慮して数値化
    const targetDate = new Date(start_time.includes('+') ? start_time : start_time + "+09:00");
    unixTimestamp = Math.floor(targetDate.getTime() / 1000);
  } else {
    unixTimestamp = Math.floor(Date.now() / 1000);
  }

  // 2. もし夜中なら、強制的に翌朝5時の始発に飛ばす処理（ZERO_RESULTS対策）
  // 19:40だと場所によっては終電に近い可能性があるため、念のため
  
  // 3. URLを1から作り直す（start_timeは捨てて、departure_timeを使う）
  const googleUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
  googleUrl.searchParams.set('origin', `place_id:${start_id}`);
  googleUrl.searchParams.set('destination', `place_id:${goal_id}`);
  googleUrl.searchParams.set('mode', 'transit'); // 電車モード
  googleUrl.searchParams.set('departure_time', unixTimestamp.toString()); // ここが数字じゃないと400エラー
  googleUrl.searchParams.set('language', 'ja');
  googleUrl.searchParams.set('key', key || '');

  console.log("--- Google送信直前チェック ---");
  console.log("送信URL:", googleUrl.toString());

  try {
    const res = await fetch(googleUrl.toString(), { cache: 'no-store' });
    const data = await res.json();

    // ZERO_RESULTS などの場合も、400エラーにせず 200 で中身を返す
    // これでフロントエンドで「経路が見つかりません」と表示できるようになる
    return NextResponse.json(data, { status: 200 });

  } catch (e) {
    return NextResponse.json({ error: "Fetch error" }, { status: 500 });
  }
}