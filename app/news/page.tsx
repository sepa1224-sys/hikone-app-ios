export default function News() {
  const newsItems = [
    { 
      id: 1, 
      title: '春のイベント開催のお知らせ', 
      date: '2024年3月15日',
      category: 'イベント'
    },
    { 
      id: 2, 
      title: '新規店舗オープン情報', 
      date: '2024年3月10日',
      category: 'お知らせ'
    },
    { 
      id: 3, 
      title: '地域清掃活動のご案内', 
      date: '2024年3月5日',
      category: '地域活動'
    },
    { 
      id: 4, 
      title: '交通規制情報', 
      date: '2024年3月1日',
      category: '交通'
    },
  ]

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">ニュース</h1>
      
      <div className="space-y-4">
        {newsItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded">
                {item.category}
              </span>
              <span className="text-gray-500 text-sm">{item.date}</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mt-3 mb-2">
              {item.title}
            </h2>
            <p className="text-gray-600 text-sm">
              地域の最新情報をお届けします。詳細は各イベントページをご確認ください。
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
