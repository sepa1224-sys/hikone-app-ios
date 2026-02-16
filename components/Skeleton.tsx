'use client'

import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  circle?: boolean
}

export function Skeleton({ className = '', width, height, circle = false }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width,
    height: height,
  }

  return (
    <div
      className={`animate-pulse bg-gray-200 ${circle ? 'rounded-full' : 'rounded-md'} ${className}`}
      style={style}
    />
  )
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-xl mx-auto p-6 pb-32">
      <div className="space-y-6">
        {/* Profile Header Skeleton */}
        <div className="bg-gray-200 rounded-[2.5rem] p-8 h-48 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton circle width={80} height={80} />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" height={24} />
              <Skeleton width="40%" height={16} />
              <Skeleton width="80%" height={16} />
            </div>
          </div>
          <Skeleton width="100%" height={40} className="mt-4 rounded-2xl" />
        </div>
        
        {/* Invite Code Skeleton */}
        <div className="bg-gray-100 rounded-[2.5rem] p-6 h-40" />
        
        {/* Profile Info Skeleton */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100 space-y-4">
          <Skeleton width="40%" height={24} />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between py-3 border-b border-gray-100">
                <Skeleton width="30%" height={16} />
                <Skeleton width="50%" height={16} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center py-4">
        <Skeleton width={120} height={32} />
        <Skeleton circle width={40} height={40} />
      </div>

      {/* Main Card Skeleton */}
      <div className="bg-gray-200 rounded-[2.5rem] h-64 w-full" />

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 rounded-3xl h-32" />
        <div className="bg-gray-100 rounded-3xl h-32" />
      </div>

      {/* List Skeleton */}
      <div className="space-y-4">
        <Skeleton width="40%" height={24} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 items-center">
            <Skeleton width={60} height={60} className="rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton width="80%" height={20} />
              <Skeleton width="50%" height={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
