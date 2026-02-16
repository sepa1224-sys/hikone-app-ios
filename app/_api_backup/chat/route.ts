import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // 開発用のモックレスポンス（APIキーがない場合やテスト用）
    // 実際には Gemini API などを呼び出しますが、まずは枠組みとして動作を確認します
    
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      // APIキーがない場合はモックで返答
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機してリアル感を出す
      
      const mockResponses = [
        "彦根城はとっても綺麗だニャン！ぜひ遊びに来てニャ！",
        "今日はいい天気だぬ！お散歩日和だニャ〜。",
        "ひこにゃんもお腹が空いたニャ。美味しい近江牛が食べたいニャン！",
        "彦根のことなら何でも聞いてニャ！応援してるニャン！"
      ];
      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      
      return NextResponse.json({
        candidates: [{
          content: {
            parts: [{ text: randomResponse }]
          }
        }]
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `あなたは彦根市の人気キャラクター「ひこにゃん」になりきって答えてください。
                  
                  【ルール】
                  1. 語尾は「〜ニャン！」「〜だぬ」「〜ニャ」などを可愛らしく使い分けてください。
                  2. 返答は短く、2〜3行以内で簡潔に。
                  3. 彦根城や彦根のことが大好きで、元気いっぱいに振る舞うこと。
                  
                  質問: ${message}` 
          }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return NextResponse.json({ error: data.error?.message || "API Error" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
