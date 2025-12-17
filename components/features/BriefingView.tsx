import React, { useState, useEffect } from 'react';
import { Users, ClipboardCheck, Mic, Save, Clock, Trash2, Edit2, X, FileText, Image as ImageIcon, Share2, Download, Eye } from 'lucide-react';
import { IconWrapper } from '../ui/IconWrapper';
import { FileUpload } from '../ui/FileUpload';

interface BriefingRecord {
    id: number;
    timestamp: string;
    review: string;
    plan: string;
    files?: Array<{ name: string; url: string; type: 'pdf' | 'image' }>;
}

interface BriefingViewProps {
    onAddNotification: (title: string, msg: string, details?: { content: string, files: any[] }) => void;
    onImageClick: (url: string) => void;
}

const showToast = (message: string) => {
    const div = document.createElement('div');
    div.className = 'fixed top-5 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg z-[100] transition-all duration-300 opacity-0 translate-y-[-20px] backdrop-blur-sm';
    div.textContent = message;
    document.body.appendChild(div);
    
    requestAnimationFrame(() => {
        div.className = 'fixed top-5 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg z-[100] transition-all duration-300 opacity-100 translate-y-0 backdrop-blur-sm';
    });

    setTimeout(() => {
        div.className = 'fixed top-5 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg z-[100] transition-all duration-300 opacity-0 translate-y-[-20px] backdrop-blur-sm';
        setTimeout(() => document.body.removeChild(div), 300);
    }, 3000);
};

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxWidth = 1024; // Reasonable size for documents/photos
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress to 60% quality
                } else {
                    reject(new Error("Canvas context error"));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    try {
        const arr = dataurl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) return null;
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    } catch (e) {
        return null;
    }
};

const openFileSafe = (base64Data: string, fileName: string) => {
    try {
        const arr = base64Data.split(',');
        if (arr.length < 2) throw new Error("Invalid");
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        
        if (mime === 'application/pdf') {
             const newWindow = window.open(blobUrl, '_blank');
             if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName;
                link.click();
             }
        } else {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
    } catch (e) {
        alert("Lỗi khi mở file.");
    }
};

export const BriefingView: React.FC<BriefingViewProps> = ({ onAddNotification, onImageClick }) => {
    const [review, setReview] = useState('');
    const [briefing, setBriefing] = useState('');
    const [files, setFiles] = useState<Array<{ name: string; url: string; type: 'pdf' | 'image' }>>([]);
    const [history, setHistory] = useState<BriefingRecord[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('briefing_history');
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }, []);

    const handleFileSelect = async (file: File, type: 'pdf' | 'image') => {
        try {
            let base64Url: string;
            if (type === 'image') {
                base64Url = await compressImage(file);
            } else {
                base64Url = await fileToBase64(file);
            }
            setFiles(prev => [...prev, { name: file.name, url: base64Url, type }]);
        } catch (error) {
            alert("Lỗi khi đọc file");
        }
    };

    const removeFile = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!review && !briefing && files.length === 0) {
            alert("Vui lòng nhập nội dung hoặc đính kèm tệp");
            return;
        }

        try {
            const fullContent = `Rút kinh nghiệm: ${review || 'Không'}\nTriển khai: ${briefing || 'Không'}`;

            if (editingId) {
                const updatedHistory = history.map(item => 
                    item.id === editingId 
                    ? { ...item, review, plan: briefing, files, timestamp: new Date().toLocaleString('vi-VN') + ' (Đã sửa)' }
                    : item
                );
                localStorage.setItem('briefing_history', JSON.stringify(updatedHistory));
                setHistory(updatedHistory);
                
                 onAddNotification('Cập nhật giao ban', 'Đã sửa nội dung giao ban', {
                    content: fullContent,
                    files: files
                });

                showToast('Đã cập nhật biên bản!');
                handleCancelEdit();
            } else {
                const newRecord: BriefingRecord = {
                    id: Date.now(),
                    timestamp: new Date().toLocaleString('vi-VN'),
                    review,
                    plan: briefing,
                    files
                };
                const updatedHistory = [newRecord, ...history];
                localStorage.setItem('briefing_history', JSON.stringify(updatedHistory));
                setHistory(updatedHistory);
                
                onAddNotification('Giao ban mới', 'Đã lưu biên bản giao ban', {
                    content: fullContent,
                    files: files
                });

                setReview('');
                setBriefing('');
                setFiles([]);
                showToast('Đã lưu biên bản giao ban và gửi thông báo!');
            }
        } catch (error) {
            alert("Bộ nhớ đầy! Vui lòng xóa bớt ảnh cũ hoặc giảm dung lượng file.");
        }
    };

    const handleEdit = (record: BriefingRecord) => {
        setEditingId(record.id);
        setReview(record.review);
        setBriefing(record.plan);
        setFiles(record.files || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Đang sửa biên bản...');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setReview('');
        setBriefing('');
        setFiles([]);
    };

    const handleDelete = (id: number) => {
        // Direct delete without confirm
        const updatedHistory = history.filter(item => item.id !== id);
        setHistory(updatedHistory);
        localStorage.setItem('briefing_history', JSON.stringify(updatedHistory));
        if (editingId === id) handleCancelEdit();
        showToast('Đã xóa biên bản giao ban');
    };

    const handleShare = async (record: BriefingRecord) => {
        let shareText = `🗣️ GIAO BAN TỔ TÀU\n`;
        shareText += `⏰ Thời gian: ${record.timestamp}\n`;
        shareText += `--------------------------------\n`;
        if (record.review) shareText += `📌 Rút kinh nghiệm:\n${record.review}\n\n`;
        if (record.plan) shareText += `🚀 Triển khai mới:\n${record.plan}\n`;

        // Generate Link with robust encoding
        const shareData = {
            type: 'briefing',
            timestamp: record.timestamp,
            review: record.review,
            plan: record.plan
        };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
        const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;

        shareText += `\n📲 Truy cập nhanh: ${link}`;

        const filesToShare: File[] = [];
        const usedNames = new Set<string>();

        if (record.files && record.files.length > 0) {
            record.files.forEach(f => {
                let fileName = f.name;
                let counter = 1;
                const dotIndex = fileName.lastIndexOf('.');
                const namePart = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
                const extPart = dotIndex !== -1 ? fileName.substring(dotIndex) : '';
                while (usedNames.has(fileName)) {
                    fileName = `${namePart} (${counter})${extPart}`;
                    counter++;
                }
                usedNames.add(fileName);
                const fileObj = dataURLtoFile(f.url, fileName);
                if (fileObj) filesToShare.push(fileObj);
            });
        }

        try {
            await navigator.clipboard.writeText(shareText);
            showToast("Đã sao chép nội dung & link! Dán nếu bị mất.");
        } catch (err) {
            console.error("Clipboard write failed", err);
        }

        if (navigator.share) {
            try {
                const shareData: ShareData = {
                    title: `Giao ban tổ tàu`,
                    text: shareText
                };
                 if (filesToShare.length > 0 && navigator.canShare && navigator.canShare({ files: filesToShare })) {
                    shareData.files = filesToShare;
                }
                await navigator.share(shareData);
                return;
            } catch (err) {
                console.log('Share canceled/failed');
            }
        }
        
        alert('Đã sao chép nội dung giao ban! Bạn có thể dán vào tin nhắn.');
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <IconWrapper colorClass="bg-indigo-100 text-indigo-600">
                        <Users className="w-6 h-6" />
                    </IconWrapper>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Giao Ban</h2>
                        <p className="text-sm text-gray-500">Tổng hợp và triển khai</p>
                    </div>
                </div>
                {editingId && (
                     <button onClick={handleCancelEdit} className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center">
                        <X className="w-4 h-4 mr-1" /> Hủy sửa
                    </button>
                )}
            </div>

            <div className={`space-y-4 transition-all duration-300 ${editingId ? 'ring-2 ring-indigo-400 rounded-2xl p-1' : ''}`}>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <ClipboardCheck className="w-5 h-5 text-orange-600" />
                            <h3 className="font-bold text-gray-800 text-sm">Kiểm điểm phiên vụ trước</h3>
                        </div>
                        <textarea value={review} onChange={(e) => setReview(e.target.value)} className="w-full min-h-[80px] p-4 rounded-xl bg-white border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none text-gray-800 resize-none transition-all placeholder:text-gray-400" placeholder="Nhập nội dung rút kinh nghiệm..." />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <Mic className="w-5 h-5 text-teal-600" />
                            <h3 className="font-bold text-gray-800 text-sm">Phổ biến phiên vụ mới</h3>
                        </div>
                        <textarea value={briefing} onChange={(e) => setBriefing(e.target.value)} className="w-full min-h-[80px] p-4 rounded-xl bg-white border border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none text-gray-800 resize-none transition-all placeholder:text-gray-400" placeholder="Nhập nội dung triển khai..." />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <FileUpload accept="application/pdf" label="Thêm PDF" icon="pdf" onFileSelect={(f) => handleFileSelect(f, 'pdf')} />
                        <FileUpload accept="image/*" label="Thêm Ảnh" icon="image" onFileSelect={(f) => handleFileSelect(f, 'image')} />
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-2 mt-2 bg-white p-3 rounded-xl border border-gray-100">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Tệp đính kèm đang soạn</label>
                            {files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                        {file.type === 'pdf' ? <FileText className="w-6 h-6 text-red-500 flex-shrink-0" /> : <ImageIcon className="w-6 h-6 text-blue-500 flex-shrink-0" />}
                                        <span className="text-sm font-medium truncate text-gray-700 max-w-[150px]">{file.name}</span>
                                    </div>
                                    <button type="button" onClick={(e) => removeFile(e, idx)} className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-400 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={handleSave} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 ${editingId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 active:scale-95'}`}>
                    {editingId ? <Edit2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                    <span>{editingId ? 'Cập nhật biên bản' : 'Lưu biên bản giao ban'}</span>
                </button>
            </div>

            {history.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-gray-500" />
                        Lịch sử giao ban
                    </h3>
                    <div className="space-y-4">
                        {history.map((record) => (
                            <div key={record.id} className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-shadow relative group ${editingId === record.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-100'}`}>
                                <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{record.timestamp}</span>
                                    <div className="flex space-x-1">
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleEdit(record); }} 
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Sửa"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleShare(record); }} 
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Chia sẻ"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Xóa"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                {record.review && <div className="mb-3"><p className="text-xs font-bold text-orange-600 mb-1">Rút kinh nghiệm:</p><p className="text-sm text-gray-700 whitespace-pre-line bg-orange-50/50 p-2 rounded-lg border border-orange-100/50">{record.review}</p></div>}
                                {record.plan && <div><p className="text-xs font-bold text-teal-600 mb-1">Triển khai mới:</p><p className="text-sm text-gray-700 whitespace-pre-line bg-teal-50/50 p-2 rounded-lg border border-teal-100/50">{record.plan}</p></div>}

                                 {record.files && record.files.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-50">
                                        {record.files.map((f, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => f.type === 'image' ? onImageClick(f.url) : openFileSafe(f.url, f.name)}
                                                className="flex items-center space-x-1 bg-gray-50 px-2 py-1.5 rounded-md text-xs font-medium text-gray-600 border border-gray-200 cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                            >
                                                {f.type === 'pdf' ? <FileText className="w-3.5 h-3.5 text-red-500" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                                                <span className="max-w-[100px] truncate">{f.name}</span>
                                                {f.type === 'image' ? <Eye className="w-3 h-3 text-gray-400 ml-1" /> : <Download className="w-3 h-3 text-gray-400 ml-1" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};