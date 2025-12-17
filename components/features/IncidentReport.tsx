import React, { useState, useEffect } from 'react';
import { AlertTriangle, Send, Camera, Clock, Trash2, FileText, Image as ImageIcon, Edit2, X, Download, Eye, Share2 } from 'lucide-react';
import { IconWrapper } from '../ui/IconWrapper';
import { FileUpload } from '../ui/FileUpload';

interface IncidentReportProps {
    onImageClick: (url: string) => void;
    onAddNotification: (title: string, msg: string, details?: { content: string, files: any[] }) => void;
}

interface IncidentRecord {
    id: number;
    description: string;
    images: string[]; 
    pdfs: { name: string; url: string }[];
    timestamp: string;
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

export const IncidentReport: React.FC<IncidentReportProps> = ({ onImageClick, onAddNotification }) => {
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [pdfs, setPdfs] = useState<{ name: string; url: string }[]>([]);
    const [history, setHistory] = useState<IncidentRecord[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('incident_history');
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load incidents", e);
        }
    }, []);

    const handleImageSelect = async (file: File) => {
        try {
            const base64 = await compressImage(file);
            setImages(prev => [...prev, base64]);
        } catch (e) {
            alert("Lỗi đọc ảnh");
        }
    };

    const handlePdfSelect = async (file: File) => {
        try {
            const base64 = await fileToBase64(file);
            setPdfs(prev => [...prev, { name: file.name, url: base64 }]);
        } catch (e) {
            alert("Lỗi đọc file PDF");
        }
    };

    const handleSend = () => {
        if (!description && images.length === 0 && pdfs.length === 0) {
            alert("Vui lòng nhập mô tả hoặc đính kèm ảnh");
            return;
        }

        try {
            const attachments = [
                ...images.map((img, i) => ({ name: `Ảnh sự cố ${i+1}.jpg`, url: img, type: 'image' })),
                ...pdfs.map(pdf => ({ name: pdf.name, url: pdf.url, type: 'pdf' }))
            ];

            if (editingId) {
                const updatedHistory = history.map(item => 
                    item.id === editingId 
                    ? { ...item, description, images, pdfs, timestamp: new Date().toLocaleString('vi-VN') + ' (Đã sửa)' }
                    : item
                );
                localStorage.setItem('incident_history', JSON.stringify(updatedHistory));
                setHistory(updatedHistory);
                
                onAddNotification('Cập nhật sự cố', 'Đã sửa báo cáo sự cố', {
                    content: description,
                    files: attachments
                });

                showToast('Đã cập nhật báo cáo!');
                handleCancelEdit();
            } else {
                const newReport: IncidentRecord = {
                    id: Date.now(),
                    description,
                    images,
                    pdfs,
                    timestamp: new Date().toLocaleString('vi-VN')
                };

                const updatedHistory = [newReport, ...history];
                localStorage.setItem('incident_history', JSON.stringify(updatedHistory));
                setHistory(updatedHistory);
                
                 onAddNotification('Sự cố mới', 'Đã ghi nhận báo cáo sự cố', {
                    content: description,
                    files: attachments
                });

                setDescription('');
                setImages([]);
                setPdfs([]);
                showToast('Đã gửi báo cáo và thông báo cho ban chỉ huy!');
            }
        } catch (e) {
            alert("Bộ nhớ đầy! Vui lòng xóa bớt ảnh cũ hoặc giảm dung lượng file.");
        }
    };

    const handleEdit = (record: IncidentRecord) => {
        setEditingId(record.id);
        setDescription(record.description);
        setImages(record.images || []);
        setPdfs(record.pdfs || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Đang sửa báo cáo...');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setDescription('');
        setImages([]);
        setPdfs([]);
    };

    const handleDelete = (id: number) => {
        const updatedHistory = history.filter(item => item.id !== id);
        setHistory(updatedHistory);
        localStorage.setItem('incident_history', JSON.stringify(updatedHistory));
        if (editingId === id) handleCancelEdit();
        showToast('Đã xóa báo cáo');
    };

    const handleShare = async (record: IncidentRecord) => {
        let shareText = `⚠️ BÁO CÁO SỰ CỐ\n`;
        shareText += `⏰ Thời gian: ${record.timestamp}\n`;
        shareText += `--------------------------------\n`;
        shareText += `${record.description}\n`;
        
        // Generate Link with robust encoding
        const shareData = {
            type: 'incident',
            description: record.description,
            timestamp: record.timestamp
        };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
        const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
        
        shareText += `\n📲 Truy cập nhanh: ${link}`;

        const filesToShare: File[] = [];
        const usedNames = new Set<string>();

        // Process Images
        if (record.images && record.images.length > 0) {
            record.images.forEach((imgBase64, index) => {
                let fileName = `Anh_Hien_Truong_${index + 1}.jpg`;
                let counter = 1;
                while (usedNames.has(fileName)) {
                    fileName = `Anh_Hien_Truong_${index + 1}_(${counter}).jpg`;
                    counter++;
                }
                usedNames.add(fileName);
                const fileObj = dataURLtoFile(imgBase64, fileName);
                if (fileObj) filesToShare.push(fileObj);
            });
        }

        // Process PDFs
        if (record.pdfs && record.pdfs.length > 0) {
            record.pdfs.forEach((pdf) => {
                let fileName = pdf.name;
                let counter = 1;
                const dotIndex = fileName.lastIndexOf('.');
                const namePart = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
                const extPart = dotIndex !== -1 ? fileName.substring(dotIndex) : '';
                while (usedNames.has(fileName)) {
                    fileName = `${namePart} (${counter})${extPart}`;
                    counter++;
                }
                usedNames.add(fileName);
                const fileObj = dataURLtoFile(pdf.url, fileName);
                if (fileObj) filesToShare.push(fileObj);
            });
        }

        // Copy Text to Clipboard
        try {
            await navigator.clipboard.writeText(shareText);
            showToast("Đã sao chép nội dung & link! Dán nếu bị mất.");
        } catch (err) {
            console.error("Clipboard write failed", err);
        }

        // Native Share
        if (navigator.share) {
            try {
                const shareData: ShareData = {
                    title: `Báo cáo sự cố`,
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
        
        alert('Đã sao chép nội dung báo cáo! Bạn có thể dán vào tin nhắn.');
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <IconWrapper colorClass="bg-red-100 text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                    </IconWrapper>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Báo Cáo Sự Cố</h2>
                        <p className="text-sm text-gray-500">Ghi nhận & xử lý nhanh</p>
                    </div>
                </div>
                 {editingId && (
                     <button onClick={handleCancelEdit} className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center">
                        <X className="w-4 h-4 mr-1" /> Hủy sửa
                    </button>
                )}
            </div>

            <div className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 transition-all duration-300 ${editingId ? 'ring-2 ring-red-400' : ''}`}>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full p-4 rounded-xl border border-red-100 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all placeholder:text-red-300 text-gray-800" placeholder="Mô tả sự cố, thời gian, địa điểm..."></textarea>
                </div>
                <div className="grid grid-cols-2 gap-3">
                     <FileUpload accept="application/pdf" label="Biên bản PDF" icon="pdf" onFileSelect={handlePdfSelect} />
                    <FileUpload accept="image/*" label="Ảnh hiện trường" icon="image" onFileSelect={handleImageSelect} />
                </div>
                {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                <img src={img} alt="incident" className="w-full h-full object-cover" onClick={() => onImageClick(img)}/>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, i) => i !== idx)); }} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 shadow-md active:scale-90 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                 {pdfs.length > 0 && (
                    <div className="space-y-1 mt-2">
                        {pdfs.map((pdf, idx) => (
                            <div key={idx} className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded flex items-center justify-between group">
                                <div className="flex items-center overflow-hidden">
                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0"></span>
                                    <span className="truncate">{pdf.name}</span>
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setPdfs(prev => prev.filter((_, i) => i !== idx)); }} className="text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button onClick={handleSend} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 ${editingId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200 active:scale-95'}`}>
                {editingId ? <Edit2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                <span>{editingId ? 'Cập Nhật Thay Đổi' : 'Gửi Báo Cáo Ngay'}</span>
            </button>

            {history.length > 0 && (
                <div className="mt-8 animate-in slide-in-from-bottom-8 duration-500">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center"><Clock className="w-5 h-5 mr-2 text-gray-500" />Lịch sử báo cáo</h3>
                    <div className="space-y-4">
                        {history.map((record) => (
                            <div key={record.id} className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all ${editingId === record.id ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-100'}`}>
                                <div className="flex justify-between items-start mb-2 border-b border-gray-50 pb-2">
                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">{record.timestamp}</span>
                                    <div className="flex space-x-1">
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleEdit(record); }} 
                                            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
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
                                <p className="text-sm text-gray-800 mb-3">{record.description}</p>
                                
                                {(record.images.length > 0 || record.pdfs.length > 0) && (
                                    <div className="flex flex-wrap gap-2 border-t border-gray-50 pt-2">
                                        {record.images.map((img, i) => (
                                            <div key={`img-${i}`} className="flex items-center text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded cursor-pointer hover:bg-blue-50 hover:text-blue-600 border border-gray-200" onClick={() => onImageClick(img)}>
                                                <ImageIcon className="w-3 h-3 mr-1" />Ảnh {i + 1}<Eye className="w-3 h-3 ml-1 text-gray-400"/>
                                            </div>
                                        ))}
                                        {record.pdfs.map((pdf, i) => (
                                            <div key={`pdf-${i}`} className="flex items-center text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded cursor-pointer hover:bg-blue-50 hover:text-blue-600 border border-gray-200" onClick={() => openFileSafe(pdf.url, pdf.name)}>
                                                <FileText className="w-3 h-3 mr-1" /><span className="max-w-[100px] truncate">{pdf.name}</span><Download className="w-3 h-3 ml-1" />
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