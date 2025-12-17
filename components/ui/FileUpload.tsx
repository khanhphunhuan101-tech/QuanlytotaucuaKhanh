import React, { useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, X } from 'lucide-react';

interface FileUploadProps {
    accept: string;
    label: string;
    onFileSelect: (file: File) => void;
    icon: 'pdf' | 'image';
}

export const FileUpload: React.FC<FileUploadProps> = ({ accept, label, onFileSelect, icon }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
            // Reset to allow selecting same file again if needed
            e.target.value = '';
        }
    };

    return (
        <div 
            onClick={handleClick}
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group active:scale-95 duration-200"
        >
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept={accept} 
                onChange={handleChange}
            />
            <div className="bg-white p-3 rounded-full shadow-sm mb-2 group-hover:shadow-md transition-all">
                {icon === 'pdf' ? (
                    <FileText className="w-6 h-6 text-red-500" />
                ) : (
                    <ImageIcon className="w-6 h-6 text-blue-500" />
                )}
            </div>
            <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
    );
};