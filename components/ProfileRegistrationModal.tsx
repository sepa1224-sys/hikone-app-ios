'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, MapPin, Save, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { 
  SHIGA_REGIONS, 
  SHIGA_REGION_CITIES, 
  CITY_DETAIL_AREAS,
  getRegionByCity,
  formatFullLocation,
  isSupportedCity,
  UNSUPPORTED_AREA_MESSAGE
} from '@/lib/constants/shigaRegions'
import { useAuth } from '@/components/AuthProvider'

interface ProfileRegistrationModalProps {
  userId: string
  userEmail?: string
  userFullName?: string
  onComplete: () => void
}

const GENDERS = ['男性', '女性', 'その他', '回答しない']
// 都道府県リスト（滋賀県を最優先に表示）
const PREFECTURES = [
  '滋賀県', // 最優先
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県', '海外'
]
const INTERESTS_OPTIONS = [
  'グルメ', '旅行', 'ショッピング', 'エンタメ', 'スポーツ', 
  'アート', '音楽', '歴史', '自然', 'カフェ'
]

// 彦根市のエリアリスト（hikone_waste_master の area_name に対応）
const HIKONE_AREAS = [
  '河瀬 亀山 稲枝東 稲枝北 稲枝西',
  '旭森 鳥居本 佐和山',
  '平田 金城',
  '城西',
  '城南 城陽 若葉 高宮',
  '城東 城北'
]

// 都道府県ごとの市区町村リスト（滋賀県以外）
const PREFECTURE_CITIES: Record<string, string[]> = {
  '北海道': ['札幌市', '函館市', '旭川市', '釧路市', '帯広市', '北見市', '小樽市', '苫小牧市', '千歳市', '江別市'],
  '青森県': ['青森市', '弘前市', '八戸市', '黒石市', '五所川原市', '十和田市', 'むつ市'],
  '岩手県': ['盛岡市', '宮古市', '大船渡市', '花巻市', '北上市', '久慈市', '遠野市', '一関市', '陸前高田市', '釜石市'],
  '宮城県': ['仙台市', '石巻市', '塩竈市', '気仙沼市', '白石市', '名取市', '角田市', '多賀城市', '岩沼市'],
  '秋田県': ['秋田市', '能代市', '横手市', '大館市', '男鹿市', '湯沢市', '鹿角市', '由利本荘市', '潟上市'],
  '山形県': ['山形市', '米沢市', '鶴岡市', '酒田市', '新庄市', '寒河江市', '上山市', '村山市', '長井市', '天童市'],
  '福島県': ['福島市', '会津若松市', '郡山市', 'いわき市', '白河市', '須賀川市', '喜多方市', '相馬市', '二本松市', '田村市'],
  '茨城県': ['水戸市', '日立市', '土浦市', '古河市', '石岡市', '結城市', '龍ケ崎市', '下妻市', '常総市', '常陸太田市'],
  '栃木県': ['宇都宮市', '足利市', '栃木市', '佐野市', '鹿沼市', '日光市', '小山市', '真岡市', '大田原市', '那須塩原市'],
  '群馬県': ['前橋市', '高崎市', '桐生市', '伊勢崎市', '太田市', '沼田市', '館林市', '渋川市', '藤岡市', '富岡市'],
  '埼玉県': ['さいたま市', '川越市', '熊谷市', '川口市', '行田市', '秩父市', '所沢市', '飯能市', '加須市', '本庄市'],
  '千葉県': ['千葉市', '銚子市', '市川市', '船橋市', '館山市', '木更津市', '松戸市', '野田市', '茂原市', '成田市'],
  '東京都': ['千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '練馬区', '北区', '荒川区', '板橋区', '足立区', '葛飾区', '江戸川区'],
  '神奈川県': ['横浜市', '川崎市', '相模原市', '横須賀市', '平塚市', '鎌倉市', '藤沢市', '小田原市', '茅ヶ崎市', '厚木市'],
  '新潟県': ['新潟市', '長岡市', '三条市', '柏崎市', '新発田市', '小千谷市', '加茂市', '十日町市', '見附市', '村上市'],
  '富山県': ['富山市', '高岡市', '魚津市', '氷見市', '滑川市', '黒部市', '砺波市', '小矢部市', '南砺市', '射水市'],
  '石川県': ['金沢市', '七尾市', '小松市', '輪島市', '珠洲市', '加賀市', '羽咋市', 'かほく市', '白山市', '能美市'],
  '福井県': ['福井市', '敦賀市', '小浜市', '大野市', '勝山市', '鯖江市', 'あわら市', '越前市', '坂井市', '永平寺町'],
  '山梨県': ['甲府市', '富士吉田市', '都留市', '山梨市', '大月市', '韮崎市', '南アルプス市', '北杜市', '甲斐市', '笛吹市'],
  '長野県': ['長野市', '松本市', '上田市', '岡谷市', '飯田市', '諏訪市', '須坂市', '小諸市', '伊那市', '駒ヶ根市'],
  '岐阜県': ['岐阜市', '大垣市', '高山市', '多治見市', '関市', '中津川市', '美濃市', '瑞浪市', '羽島市', '恵那市'],
  '静岡県': ['静岡市', '浜松市', '沼津市', '熱海市', '三島市', '富士宮市', '伊東市', '島田市', '富士市', '磐田市'],
  '愛知県': ['名古屋市', '豊橋市', '岡崎市', '一宮市', '瀬戸市', '半田市', '春日井市', '豊川市', '津島市', '碧南市'],
  '三重県': ['津市', '四日市市', '伊勢市', '松阪市', '桑名市', '鈴鹿市', '名張市', '尾鷲市', '亀山市', '鳥羽市'],
  '京都府': ['京都市', '福知山市', '舞鶴市', '綾部市', '宇治市', '宮津市', '亀岡市', '城陽市', '向日市', '長岡京市'],
  '大阪府': ['大阪市', '堺市', '岸和田市', '豊中市', '池田市', '吹田市', '泉大津市', '高槻市', '貝塚市', '守口市'],
  '兵庫県': ['神戸市', '姫路市', '尼崎市', '明石市', '西宮市', '洲本市', '芦屋市', '伊丹市', '相生市', '豊岡市'],
  '奈良県': ['奈良市', '大和高田市', '大和郡山市', '天理市', '橿原市', '桜井市', '五條市', '御所市', '生駒市', '香芝市'],
  '和歌山県': ['和歌山市', '海南市', '橋本市', '有田市', '御坊市', '田辺市', '新宮市', '紀の川市', '岩出市', '有田郡'],
  '鳥取県': ['鳥取市', '米子市', '倉吉市', '境港市'],
  '島根県': ['松江市', '浜田市', '出雲市', '益田市', '大田市', '安来市', '江津市', '雲南市'],
  '岡山県': ['岡山市', '倉敷市', '津山市', '玉野市', '笠岡市', '井原市', '総社市', '高梁市', '新見市', '備前市'],
  '広島県': ['広島市', '呉市', '竹原市', '三原市', '尾道市', '福山市', '府中市', '三次市', '庄原市', '大竹市'],
  '山口県': ['下関市', '宇部市', '山口市', '萩市', '防府市', '下松市', '岩国市', '光市', '長門市', '柳井市'],
  '徳島県': ['徳島市', '鳴門市', '小松島市', '阿南市', '吉野川市', '阿波市', '美馬市', '三好市'],
  '香川県': ['高松市', '丸亀市', '坂出市', '善通寺市', '観音寺市', 'さぬき市', '東かがわ市', '三豊市'],
  '愛媛県': ['松山市', '今治市', '宇和島市', '八幡浜市', '新居浜市', '西条市', '大洲市', '伊予市', '四国中央市', '西予市'],
  '高知県': ['高知市', '室戸市', '安芸市', '南国市', '土佐市', '須崎市', '宿毛市', '土佐清水市', '四万十市', '香南市'],
  '福岡県': ['福岡市', '北九州市', '大牟田市', '久留米市', '直方市', '飯塚市', '田川市', '柳川市', '八女市', '筑後市'],
  '佐賀県': ['佐賀市', '唐津市', '鳥栖市', '多久市', '伊万里市', '武雄市', '鹿島市', '小城市', '嬉野市', '神埼市'],
  '長崎県': ['長崎市', '佐世保市', '島原市', '諫早市', '大村市', '平戸市', '松浦市', '対馬市', '壱岐市', '五島市'],
  '熊本県': ['熊本市', '八代市', '人吉市', '荒尾市', '水俣市', '玉名市', '山鹿市', '菊池市', '宇土市', '上天草市'],
  '大分県': ['大分市', '別府市', '中津市', '日田市', '佐伯市', '臼杵市', '津久見市', '竹田市', '豊後高田市', '杵築市'],
  '宮崎県': ['宮崎市', '都城市', '延岡市', '日南市', '小林市', '日向市', '串間市', '西都市', 'えびの市', '三股町'],
  '鹿児島県': ['鹿児島市', '鹿屋市', '枕崎市', '阿久根市', '出水市', '指宿市', '西之表市', '垂水市', '薩摩川内市', '日置市'],
  '沖縄県': ['那覇市', '宜野湾市', '石垣市', '浦添市', '名護市', '糸満市', '沖縄市', '豊見城市', 'うるま市', '宮古島市']
}

export default function ProfileRegistrationModal({
  userId,
  userEmail,
  userFullName,
  onComplete
}: ProfileRegistrationModalProps) {
  const { refreshProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [formData, setFormData] = useState({
    full_name: userFullName || '',
    gender: '',
    birthday: '',
    prefecture: '', // 都道府県（location → prefecture に変更）
    region: '', // 地方区分（湖東、湖南、湖北、湖西）- 滋賀県のみ
    city: '', // 市区町村
    selected_area: '', // ゴミ収集エリア名（hikone_waste_master.area_name）
    detail_area: '', // 詳細エリア（自由入力または選択）
    interests: [] as string[],
    is_student: null as boolean | null,
    user_type: '', // '大学生', '高校生', '専門学生', '社会人', 'その他'
    university_name: '', // 大学名（user_typeが大学生の場合）
    school_name: '',
    grade: '' as string | number
  })

  // 生年月日を年・月・日に分解して管理
  const [birthYear, setBirthYear] = useState<string>('')
  const [birthMonth, setBirthMonth] = useState<string>('')
  const [birthDay, setBirthDay] = useState<string>('')

  // 年・月・日からYYYY-MM-DD形式の文字列を生成
  const formatBirthday = (year: string, month: string, day: string): string => {
    if (!year || !month || !day) return ''
    const monthPadded = month.padStart(2, '0')
    const dayPadded = day.padStart(2, '0')
    return `${year}-${monthPadded}-${dayPadded}`
  }

  // 月の日数を取得（うるう年対応）
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate()
  }

  // 年と月が変更された時に日を調整
  useEffect(() => {
    if (birthYear && birthMonth) {
      const yearNum = parseInt(birthYear, 10)
      const monthNum = parseInt(birthMonth, 10)
      const maxDays = getDaysInMonth(yearNum, monthNum)
      if (birthDay && parseInt(birthDay, 10) > maxDays) {
        setBirthDay(maxDays.toString())
      }
    }
  }, [birthYear, birthMonth, birthDay])

  // 都道府県が変更された時に地方区分・市区町村・エリアをリセット
  useEffect(() => {
    if (!formData.prefecture || formData.prefecture === '海外') {
      setFormData(prev => ({ ...prev, region: '', city: '', selected_area: '', detail_area: '' }))
    } else if (formData.prefecture !== '滋賀県') {
      // 滋賀県以外は地方区分をリセット
      setFormData(prev => ({ ...prev, region: '', city: '', selected_area: '', detail_area: '' }))
    }
  }, [formData.prefecture])
  
  // 地方区分が変更された時に市区町村とエリアをリセット
  useEffect(() => {
    if (formData.prefecture === '滋賀県' && formData.region) {
      setFormData(prev => ({ ...prev, city: '', selected_area: '', detail_area: '' }))
    }
  }, [formData.region, formData.prefecture])
  
  // 市区町村が変更された時にエリアをリセット
  useEffect(() => {
    setFormData(prev => ({ ...prev, selected_area: '', detail_area: '' }))
    if (formData.prefecture === '滋賀県' && formData.city && !formData.region) {
      const detectedRegion = getRegionByCity(formData.city)
      if (detectedRegion) {
        setFormData(prev => ({ ...prev, region: detectedRegion }))
      }
    }
  }, [formData.city, formData.prefecture, formData.region])

  // 閉じる関数
  const handleClose = () => {
    onComplete()
  }


  useEffect(() => {
    console.log('📋 [ProfileModal] Current is_student state:', formData.is_student)
  }, [formData.is_student])

  const checkProfileStatus = useCallback(async () => {
    try {
      if (!userId) {
        console.error('📋 [ProfileModal] No userId provided')
        setLoading(false)
        return
      }

      console.log('📋 [ProfileModal] Fetching profile for:', userId)

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, gender, birthday, prefecture, location, region, city, selected_area, detail_area, interests, is_student, school_name, grade, user_type, university_name')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('📋 [ProfileModal] Fetch error:', error.message)
      }

      if (data) {
        console.log('Fetched Data:', data)
        console.log('📋 [ProfileModal] Data received from DB:', data)
        
        const birthday = data.birthday || ''
        let year = '', month = '', day = ''
        if (birthday) {
          const parts = birthday.split('-')
          if (parts.length === 3) {
            year = parts[0]; month = parts[1]; day = parts[2]
          }
        }

        // is_student: null を明示的に扱う（undefined で止まらない）
        const isStudentFromDB = data.is_student
        const schoolNameFromDB = data.school_name ?? ''
        const isStudentValue: boolean | null =
          isStudentFromDB === true || isStudentFromDB === false
            ? isStudentFromDB
            : schoolNameFromDB
              ? true
              : null

        console.log('📋 [ProfileModal] Initializing form with:', {
          isStudentFromDB,
          schoolNameFromDB,
          isStudentValue
        })

        setFormData({
          full_name: data.full_name || userFullName || '',
          gender: data.gender || '',
          birthday: birthday,
          prefecture: data.prefecture || data.location || '',
          region: data.region || '',
          city: data.city || '',
          selected_area: data.selected_area || '',
          detail_area: data.detail_area || '',
          interests: data.interests || [],
          is_student: isStudentValue ?? null,
          user_type: data.user_type || '',
          university_name: data.university_name || '',
          school_name: schoolNameFromDB,
          grade: data.grade ?? ''
        })
        setBirthYear(year)
        setBirthMonth(month)
        setBirthDay(day)
      } else {
        console.log('📋 [ProfileModal] No data found for user, using defaults')
      }
    } catch (err) {
      console.error('📋 [ProfileModal] Unexpected fetch error:', err)
    } finally {
      console.log('📋 [ProfileModal] Setting loading to false')
      setLoading(false)
    }
  }, [userId, userFullName])

  // マウント時にプロフィール取得 + 3秒で強制ロード解除の安全装置
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.log('📋 [ProfileModal] 3秒タイムアウト: 強制的に setLoading(false)')
        setLoading(false)
      }
    }, 3000)
    checkProfileStatus().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
    }
  }, [userId, checkProfileStatus])

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => {
      const current = prev.interests || []
      const updated = current.includes(interest)
        ? current.filter(i => i !== interest)
        : [...current, interest]
      return { ...prev, interests: updated }
    })
  }

  const handleSubmit = async () => {
    // 必須項目のチェック
    if (!formData.full_name.trim()) {
      setErrorMsg('お名前を入力してください')
      setTimeout(() => setErrorMsg(''), 3000)
      return
    }

    if (formData.is_student === null) {
      setErrorMsg('学生か社会人かを選択してください')
      setTimeout(() => setErrorMsg(''), 3000)
      return
    }

    if (formData.is_student === true) {
      if (!formData.user_type) {
        setErrorMsg('学生区分を選択してください')
        setTimeout(() => setErrorMsg(''), 3000)
        return
      }
      
      if (formData.user_type === '大学生' && !formData.university_name) {
        setErrorMsg('大学名を入力してください')
        setTimeout(() => setErrorMsg(''), 3000)
        return
      }

      if (formData.user_type !== '大学生' && !formData.school_name) {
        setErrorMsg('学校名を入力してください')
        setTimeout(() => setErrorMsg(''), 3000)
        return
      }

      if (!formData.grade) {
        setErrorMsg('学年を選択してください')
        setTimeout(() => setErrorMsg(''), 3000)
        return
      }
    }

    // ===== 対応エリアのバリデーション =====
    // 滋賀県が選択されている場合、市区町村が対応エリアかチェック
    if (formData.prefecture === '滋賀県' && formData.city) {
      if (!isSupportedCity(formData.city)) {
        setErrorMsg(UNSUPPORTED_AREA_MESSAGE)
        // エラーメッセージは長いので5秒間表示
        setTimeout(() => setErrorMsg(''), 5000)
        return
      }
    }

    setSaving(true)
    setErrorMsg('')

    try {
      if (!userId) {
        setErrorMsg('ユーザーIDが見つかりません')
        setSaving(false)
        return
      }

      // 年・月・日からYYYY-MM-DD形式の文字列を生成
      const birthdayString = formatBirthday(birthYear, birthMonth, birthDay)

      console.log('保存開始 - User ID:', userId, 'Form Data:', formData, 'Birthday:', birthdayString)

      // 保存するデータを準備（すべてTEXT型で保存）
      // 注意: selected_area はゴミ収集判定に使用、detail_area は詳細エリア表示用
      // detail_area カラムがDBにない場合はエラーになるため、まず基本カラムのみで保存を試みる
      
      // ゴミ収集エリア（selected_area）の決定
      // formData.selected_area がある場合はそれを使用、なければ detail_area を使用
      const selectedAreaValue = formData.selected_area || formData.detail_area || null
      
      const profileData: Record<string, any> = {
        id: userId,
        full_name: formData.full_name || null,
        gender: formData.gender || null,
        birthday: birthdayString || null, // YYYY-MM-DD形式の日付文字列
        // 都道府県: prefecture と location の両方に保存（後方互換性）
        prefecture: formData.prefecture || null,
        location: formData.prefecture || null, // 旧カラム名にも同じ値を保存
        region: formData.region || null, // 地方区分（湖東、湖南、湖北、湖西）
        city: formData.city || null, // 市区町村
        selected_area: selectedAreaValue, // ゴミ収集エリア（detail_area と統合）
        interests: formData.interests.length > 0 ? formData.interests : null,
        is_student: formData.is_student,
        school_name: formData.is_student ? formData.school_name : null,
        grade: formData.is_student ? (formData.grade || null) : null,
        user_type: formData.is_student ? formData.user_type : null,
        university_name: (formData.is_student && formData.user_type === '大学生') ? formData.university_name : null,
        updated_at: new Date().toISOString()
      }
      
      // detail_area カラムが存在する場合は追加（マイグレーション適用後）
      // 存在しない場合はエラーを無視して selected_area に統合済み
      if (formData.detail_area) {
        profileData.detail_area = formData.detail_area
      }
      
      console.log('📋 [Profile] 保存データ:', profileData)
      console.log('📋 [Profile] ユーザーID:', userId)

      // profilesテーブルにupsert（更新または挿入）
      // onConflict: 'id' を明示的に指定して、既存レコードがある場合は確実に更新
      let { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false // falseにすることで、既存レコードを更新
        })
        .select()

      // detail_area や学生関連のカラムが存在しないエラーの場合、それらを除いて再試行
      if (error && (error.message.includes('detail_area') || error.message.includes('is_student') || error.message.includes('school_name') || error.message.includes('grade') || error.message.includes('user_type') || error.message.includes('university_name'))) {
        console.warn('📋 [Profile] 新しいカラムが存在しないため、除外して再試行')
        const retryProfileData = { ...profileData }
        delete retryProfileData.detail_area
        delete retryProfileData.is_student
        delete retryProfileData.school_name
        delete retryProfileData.grade
        delete retryProfileData.user_type
        delete retryProfileData.university_name
        const retryResult = await supabase
          .from('profiles')
          .upsert(retryProfileData, { 
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
        data = retryResult.data
        error = retryResult.error
      }

      if (error) {
        console.error('📋 [Profile] 保存失敗の理由:', error.message)
        console.error('📋 [Profile] エラー詳細:', JSON.stringify(error, null, 2))
        console.error('📋 [Profile] エラーコード:', error.code)
        
        setErrorMsg(`保存に失敗しました: ${error.message}`)
        setSaving(false) // エラー時も確実に解除
        setTimeout(() => setErrorMsg(''), 5000)
      } else {
        console.log('📋 [Profile] 保存成功:', data)
        setShowSuccess(true)
        setErrorMsg('')
        
        // コンテキストのプロフィールを更新
        await refreshProfile()
        // モーダル内のステートも最新化（DBから再取得）
        console.log('📋 [Profile] 保存完了、最新データを再取得します')
        await checkProfileStatus()
        
        // 保存成功通知を表示してからモーダルを閉じる
        setTimeout(() => {
          setSaving(false) // 閉じる直前に解除
          onComplete()
        }, 1500)
      }
    } catch (error: any) {
      console.error('Unexpected error:', error)
      setErrorMsg(`予期しないエラー: ${error?.message || '不明なエラー'}`)
      setSaving(false) // 例外時も確実に解除
      setTimeout(() => setErrorMsg(''), 5000)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md">
        <div className="bg-white rounded-[3rem] p-8 text-center">
          <div className="animate-spin text-4xl mb-4">🐱</div>
          <p className="font-black text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 年・月・日の選択肢を生成
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 101 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const maxDays = birthYear && birthMonth 
    ? getDaysInMonth(parseInt(birthYear, 10), parseInt(birthMonth, 10))
    : 31
  const days = Array.from({ length: maxDays }, (_, i) => i + 1)

  // 選択された都道府県・地方区分に基づいて市区町村リストを取得
  const availableCities = (() => {
    if (!formData.prefecture || formData.prefecture === '海外') return []
    
    // 滋賀県の場合は地方区分に基づいて市区町村を取得
    if (formData.prefecture === '滋賀県') {
      if (formData.region && SHIGA_REGION_CITIES[formData.region as keyof typeof SHIGA_REGION_CITIES]) {
        return SHIGA_REGION_CITIES[formData.region as keyof typeof SHIGA_REGION_CITIES]
      }
      // 地方区分が選択されていない場合は全ての滋賀県市区町村を表示
      return Object.values(SHIGA_REGION_CITIES).flat()
    }
    
    // 他の都道府県
    return PREFECTURE_CITIES[formData.prefecture] || []
  })()
  
  // 詳細エリアの選択肢を取得
  const availableDetailAreas = formData.city ? (CITY_DETAIL_AREAS[formData.city] || []) : []

  return (
    <>
      {/* 背景オーバーレイ（クリックで閉じる） */}
      <div 
        className="fixed inset-0 z-[109] bg-black/50 animate-fade-in" 
        onClick={handleClose}
      />
      
      {/* モーダル */}
      <div className="fixed inset-0 z-[110] flex items-end justify-center animate-slide-up pointer-events-none">
        <div className="bg-white w-full max-w-md rounded-t-[3rem] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl pointer-events-auto">
          {/* ヘッダー */}
          <div className="flex-shrink-0 p-6 border-b flex justify-between items-center bg-gradient-to-r from-orange-50 to-red-50">
            <div className="flex items-center gap-3">
              <Sparkles className="text-orange-500" size={24} />
              <div>
                <h2 className="text-xl font-black text-gray-900">プロフィール登録</h2>
                <p className="text-xs text-gray-500 font-bold">あなたの情報を教えてニャ</p>
              </div>
            </div>
            {/* 閉じるボタン（×） */}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
              aria-label="閉じる"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* スクロール可能なコンテンツ */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 学生・社会人選択（最優先） */}
            <div className="bg-orange-50 p-5 rounded-[2rem] border-2 border-orange-200 space-y-4">
              <label className="flex items-center gap-2 ml-2">
                <Sparkles className="text-orange-500" size={18} />
                <span className="text-sm font-black text-gray-700">学生ですか？それとも社会人ですか？</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, is_student: true })}
                  className={`py-4 rounded-2xl font-black text-base transition-all flex flex-col items-center justify-center gap-1 ${
                    formData.is_student === true
                      ? 'bg-orange-500 text-white shadow-lg scale-105 border-b-4 border-orange-700'
                      : 'bg-white text-gray-600 border-2 border-orange-100 hover:border-orange-300'
                  }`}
                >
                  <span>学生です</span>
                  <span className="text-[10px] opacity-80">大学・専門・高校など</span>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, is_student: false, school_name: '', grade: '' })}
                  className={`py-4 rounded-2xl font-black text-base transition-all flex flex-col items-center justify-center gap-1 ${
                    formData.is_student === false
                      ? 'bg-blue-500 text-white shadow-lg scale-105 border-b-4 border-blue-700'
                      : 'bg-white text-gray-600 border-2 border-blue-100 hover:border-blue-300'
                  }`}
                >
                  <span>社会人です</span>
                  <span className="text-[10px] opacity-80">学生以外の方</span>
                </button>
              </div>

              {/* 学生の場合の追加項目 */}
              {formData.is_student === true && (
                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  
                  {/* 学生区分 */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 ml-2">学生区分</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['大学生', '高校生', '専門学生', 'その他'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFormData({ ...formData, user_type: type })}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            formData.user_type === type
                              ? 'bg-orange-500 text-white shadow-md'
                              : 'bg-white text-gray-600 border border-orange-100 hover:bg-orange-50'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 大学生の場合: 大学名 */}
                  {formData.user_type === '大学生' && (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-500 ml-2">大学名</label>
                      <select
                        value={['滋賀大学', '滋賀県立大学', '聖泉大学', ''].includes(formData.university_name) ? formData.university_name : 'その他'}
                        onChange={(e) => {
                          const val = e.target.value
                          setFormData({ 
                            ...formData, 
                            university_name: val === 'その他' ? '' : val 
                          })
                        }}
                        className="w-full bg-white border-2 border-orange-100 rounded-xl py-3 px-4 font-bold text-gray-700 focus:border-orange-400 focus:outline-none text-sm"
                      >
                        <option value="">大学名を選択してください</option>
                        <option value="滋賀大学">滋賀大学</option>
                        <option value="滋賀県立大学">滋賀県立大学</option>
                        <option value="聖泉大学">聖泉大学</option>
                        <option value="その他">その他（自由入力）</option>
                      </select>
                      {(!['滋賀大学', '滋賀県立大学', '聖泉大学', ''].includes(formData.university_name) || formData.university_name === '') && (
                        // 「その他」が選択された場合（空文字含む）またはリストにない値の場合に入力を表示
                        // ただし初期状態（空）では表示したくないので、Selectが「その他」の時だけ表示する制御が必要
                        // ここでは簡易的に「Selectの値が'その他'」の時にInputを出すようにするが、
                        // Inputに入力するとSelectの値は'その他'になる（リストにないから）のでOK
                        (['滋賀大学', '滋賀県立大学', '聖泉大学', ''].includes(formData.university_name) === false || formData.university_name === '') && 
                        // 直前のSelectで「その他」を選んだ場合、formData.university_nameは''になる
                        // その場合に入力を出したいが、初期状態も''なので区別がつかない
                        // なので、university_nameが空の場合はSelectで選ばせる
                        // 一旦、値が入っているがリストにない場合のみInputを表示し、
                        // 「その他」を選んだ時はInputにフォーカスさせるなどの工夫が必要
                        // シンプルに: Selectでその他を選んだら、Inputを表示。
                        <input
                          type="text"
                          placeholder="大学名を入力してください"
                          className="w-full bg-white border-2 border-orange-100 rounded-xl py-3 px-4 font-bold text-gray-700 focus:border-orange-400 focus:outline-none text-sm mt-2"
                          value={formData.university_name}
                          onChange={(e) => setFormData({ ...formData, university_name: e.target.value })}
                        />
                      )}
                    </div>
                  )}

                  {/* 大学生以外の場合: 学校名 */}
                  {(formData.user_type && formData.user_type !== '大学生') && (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-500 ml-2">学校名</label>
                      <select
                        value={['近江高校', '彦根東高校', '彦根総合高校', '彦根工業高校', '河瀬高校', ''].includes(formData.school_name) ? formData.school_name : 'その他'}
                        onChange={(e) => {
                          const val = e.target.value
                          setFormData({ 
                            ...formData, 
                            school_name: val === 'その他' ? '' : val 
                          })
                        }}
                        className="w-full bg-white border-2 border-orange-100 rounded-xl py-3 px-4 font-bold text-gray-700 focus:border-orange-400 focus:outline-none text-sm"
                      >
                        <option value="">学校名を選択してください</option>
                        {formData.user_type === '高校生' && (
                          <>
                            <option value="近江高校">近江高校</option>
                            <option value="彦根東高校">彦根東高校</option>
                            <option value="彦根総合高校">彦根総合高校</option>
                            <option value="彦根工業高校">彦根工業高校</option>
                            <option value="河瀬高校">河瀬高校</option>
                          </>
                        )}
                        <option value="その他">その他（自由入力）</option>
                      </select>
                      {(!['近江高校', '彦根東高校', '彦根総合高校', '彦根工業高校', '河瀬高校', ''].includes(formData.school_name)) && (
                        <input
                          type="text"
                          placeholder="学校名を入力してください"
                          className="w-full bg-white border-2 border-orange-100 rounded-xl py-3 px-4 font-bold text-gray-700 focus:border-orange-400 focus:outline-none text-sm mt-2"
                          value={formData.school_name}
                          onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                        />
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 ml-2">学年</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full bg-white border-2 border-orange-100 rounded-xl py-3 px-4 font-bold text-gray-700 focus:border-orange-400 focus:outline-none text-sm"
                    >
                      <option value="">学年を選択してください</option>
                      {[1, 2, 3, 4, 5, 6].map(g => (
                        <option key={g} value={g}>{g}年生</option>
                      ))}
                      <option value="院生・その他">院生・その他</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 通知エリア */}
            {showSuccess && (
              <div className="bg-green-500 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg animate-in zoom-in duration-300">
                <CheckCircle2 size={20} />
                <span className="font-bold">保存しました</span>
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-500 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg animate-in shake duration-300">
                <AlertCircle size={20} />
                <span className="font-bold">{errorMsg}</span>
              </div>
            )}

            {/* お名前 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">お名前 *</span>
              </label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-white border-2 border-gray-200 rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                  placeholder="山田 太郎"
                />
              </div>
            </div>

            {/* 性別 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">性別</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {GENDERS?.map((gender) => (
                  <button
                    key={gender}
                    onClick={() => setFormData({ ...formData, gender })}
                    className={`py-3 rounded-[1.2rem] font-black text-sm transition-all ${
                      formData.gender === gender
                        ? 'bg-orange-500 text-white shadow-lg scale-105'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            {/* 生年月日（年・月・日の3つのプルダウン） */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">生年月日</span>
              </label>
              <div className="flex gap-3">
                {/* 年 */}
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="flex-1 bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 px-4 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                >
                  <option value="">年</option>
                  {years.map((year) => (
                    <option key={year} value={year.toString()}>{year}年</option>
                  ))}
                </select>
                {/* 月 */}
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="flex-1 bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 px-4 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                >
                  <option value="">月</option>
                  {months.map((month) => (
                    <option key={month} value={month.toString()}>{month}月</option>
                  ))}
                </select>
                {/* 日 */}
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="flex-1 bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 px-4 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                >
                  <option value="">日</option>
                  {days.map((day) => (
                    <option key={day} value={day.toString()}>{day}日</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 居住地（都道府県・地方区分・市区町村・詳細エリア） */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">居住地</span>
              </label>
              
              {/* Step 1: 都道府県選択 */}
              <div className="relative">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <select
                  value={formData.prefecture}
                  onChange={(e) => setFormData({ ...formData, prefecture: e.target.value, region: '', city: '', selected_area: '', detail_area: '' })}
                  className="w-full bg-white border-2 border-gray-200 rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-black focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                >
                  <option value="">① 都道府県を選択</option>
                  {PREFECTURES?.map((pref) => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
              </div>
              
              {/* Step 2: 地方区分選択（滋賀県の場合のみ表示） */}
              {formData.prefecture === '滋賀県' && (
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value, city: '', selected_area: '', detail_area: '' })}
                    className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-black focus:border-emerald-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                  >
                    <option value="">② 地方区分を選択</option>
                    {SHIGA_REGIONS.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Step 3: 市区町村選択（都道府県が選択されている場合のみ表示） */}
              {formData.prefecture && formData.prefecture !== '海外' && (
                // 滋賀県の場合は地方区分選択後に表示、それ以外は都道府県選択後に表示
                (formData.prefecture !== '滋賀県' || formData.region) && availableCities.length > 0 && (
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value, selected_area: '', detail_area: '' })}
                      className="w-full bg-white border-2 border-gray-200 rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-black focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                    >
                      <option value="">{formData.prefecture === '滋賀県' ? '③' : '②'} 市区町村を選択</option>
                      {availableCities?.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                )
              )}
              
              {/* Step 4: 詳細エリア選択（彦根市などの場合表示） */}
              {formData.city && availableDetailAreas.length > 0 && (
                <>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
                    <select
                      value={formData.selected_area}
                      onChange={(e) => setFormData({ ...formData, selected_area: e.target.value })}
                      className="w-full bg-blue-50 border-2 border-blue-200 rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-black focus:border-blue-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                    >
                      <option value="">{formData.prefecture === '滋賀県' ? '④' : '③'} お住まいのエリアを選択</option>
                      {availableDetailAreas?.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                  {formData.city === '彦根市' && (
                    <p className="text-[10px] text-gray-500 ml-2">
                      ※ エリアに合わせた情報（ゴミ収集日、イベント等）をお届けします
                    </p>
                  )}
                </>
              )}
              
              {/* Step 5: 詳細エリア自由入力（選択肢がない市区町村の場合） */}
              {formData.city && availableDetailAreas.length === 0 && (
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input
                    type="text"
                    value={formData.detail_area}
                    onChange={(e) => setFormData({ ...formData, detail_area: e.target.value })}
                    placeholder={`${formData.prefecture === '滋賀県' ? '④' : '③'} 詳細エリア（任意）例：城南、高宮など`}
                    className="w-full bg-white border-2 border-gray-200 rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-black placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                  />
                </div>
              )}
              
              {/* 選択状況の表示 */}
              {formData.city && (
                <div className={`p-3 rounded-2xl border ${formData.selected_area || formData.detail_area ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-xs font-bold text-black`}>
                    📍 {formatFullLocation(
                      formData.prefecture,
                      formData.prefecture === '滋賀県' ? formData.region : null,
                      formData.city,
                      formData.selected_area || formData.detail_area
                    )}
                  </p>
                  {formData.city === '彦根市' && !formData.selected_area && (
                    <p className="text-[10px] text-orange-500 mt-1">
                      ⚠️ エリアを選択すると、ゴミ出し日などの地域情報が届きます
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 興味関心 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">興味関心（複数選択可）</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS_OPTIONS?.map((interest) => {
                  const isSelected = formData.interests?.includes(interest)
                  return (
                    <button
                      key={interest}
                      onClick={() => handleInterestToggle(interest)}
                      className={`px-4 py-2 rounded-full font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {interest}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* フッター（保存ボタン・キャンセルボタン） */}
          <div className="flex-shrink-0 p-6 border-t bg-white space-y-3">
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.full_name.trim() || formData.is_student === null}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-[1.5rem] font-black shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {saving ? (
                <>
                  <div className="animate-spin">🐱</div>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>保存するニャ！</span>
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={saving}
              className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-700 py-3 rounded-[1.5rem] font-black active:scale-95 transition-all"
            >
              キャンセル
            </button>
            <p className="text-center text-xs text-gray-400 font-bold">
              *は必須項目です
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
