-- マンスリーミッションの初期データ投入
INSERT INTO public.monthly_missions (title, description, mission_type, points, month)
VALUES 
  (
    '彦根城天守閣でチェックイン！', 
    '彦根城の天守閣入口にあるQRコードをスキャンして、登城記念ポイントをゲットしよう！', 
    'qr', 
    500, 
    to_char(now(), 'YYYY-MM')
  ),
  (
    'ひこにゃんとツーショット', 
    'ひこにゃん登場スケジュールに合わせて会いに行き、写真を撮ってアップロードしよう！', 
    'photo', 
    1000, 
    to_char(now(), 'YYYY-MM')
  ),
  (
    '夢京橋キャッスルロードで食べ歩き', 
    'キャッスルロードの対象店舗で商品を購入し、レジ横のQRコードをスキャンしよう。', 
    'qr', 
    300, 
    to_char(now(), 'YYYY-MM')
  );
