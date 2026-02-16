'use client'

import { School } from '@/lib/supabase'
import { GraduationCap, Users } from 'lucide-react'

type Props = {
  school: School | null
  studentCount: number
}

export default function StudentHeader({ school, studentCount }: Props) {
  if (!school) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-b-[2.5rem] shadow-lg mb-6">
        <div className="flex flex-col items-center justify-center text-center">
          <GraduationCap size={48} className="mb-2 opacity-80" />
          <h1 className="text-xl font-bold mb-2">学生ポータルへようこそ</h1>
          <p className="text-sm opacity-90">学校情報を登録して、コミュニティに参加しよう！</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 pb-10 rounded-b-[2.5rem] shadow-lg relative overflow-hidden mb-6">
      {/* 装飾用背景パターン */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8 blur-xl"></div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm shadow-inner border border-white/30">
          <GraduationCap size={32} className="text-white" />
        </div>
        
        <h1 className="text-2xl font-black mb-1 tracking-tight drop-shadow-md">
          {school.name}
        </h1>
        
        <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md mt-2 border border-white/10">
          <Users size={14} className="text-cyan-200" />
          <span className="text-xs font-bold">
            現在 <span className="text-yellow-300 text-sm">{studentCount}</span> 名の学生が参加中！
          </span>
        </div>
      </div>
    </div>
  )
}
