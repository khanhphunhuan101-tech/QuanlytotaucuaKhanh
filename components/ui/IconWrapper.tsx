import React from 'react';

interface IconWrapperProps {
    children: React.ReactNode;
    colorClass?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const IconWrapper: React.FC<IconWrapperProps> = ({ children, colorClass = "bg-blue-100 text-blue-600", size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    return (
        <div className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center shadow-sm`}>
            {children}
        </div>
    );
};