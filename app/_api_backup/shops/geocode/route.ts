import { NextResponse } from 'next/server';

/**
 * Google Geocoding API を使用して住所から座標を取得
 * - 座標がない店舗のみこのAPIを叩く
 * - 取得した座標はクライアント側でSupabaseにUPDATEする
 */
export async function POST(req: Request) {
  try {
    const { name, address } = await req.json();
    
    // 複数の候補からAPIキーを探す
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.Maps_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('❌ APIキーが見つかりません。envを確認してください');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // 検索クエリを構築（住所優先、なければ店名）
    const searchQuery = address || name;
    if (!searchQuery) {
      return NextResponse.json({ success: false, error: 'No address or name provided' }, { status: 400 });
    }

    console.log(`🔍 Geocoding API 実行: "${searchQuery}"`);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${apiKey}&region=jp&language=ja`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;
      const place_id = result.place_id || null;
      
      console.log(`✅ 座標取得成功: [${lat}, ${lng}] (place_id: ${place_id})`);
      
      return NextResponse.json({ 
        success: true, 
        latitude: lat, 
        longitude: lng,
        place_id: place_id,
        formatted_address: result.formatted_address || null
      });
    } else {
      console.error('Google API Error:', data.status, data.error_message || '');
      return NextResponse.json({ 
        success: false, 
        error: data.status,
        error_message: data.error_message || 'No results found'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
