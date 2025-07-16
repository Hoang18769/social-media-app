import {useMemo} from "react";

export default function PostSkeleton () {
    return(

    <div
        className="w-full max-w-[600px]  bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-3 mb-4">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>

        {/* Image skeleton */}
        <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded-lg mb-4"></div>

        {/* Actions skeleton */}
        <div className="flex items-center space-x-6">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
        </div>
    </div>
        )
}
