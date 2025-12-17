import React, { useState, useEffect } from 'react';
import { FileText, Star, Link as LinkIcon, Download, X, Eye, Save, Trash2, History, Calendar, Share2, Edit2, Image as ImageIcon } from 'lucide-react';
import { IconWrapper } from '../ui/IconWrapper';
import { FileUpload } from '../ui/FileUpload';
import { DocumentItem } from '../../types';

interface DocumentManagerProps {
    mode: 'general' | 'coupling';
    onImageClick: (url: string) => void;
    onAddNotification: (title: string, msg: string, details?: { content: string, files: any[] }) => void;
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

export const DocumentManager: React.FC<DocumentManagerProps> = ({ mode, onImageClick, onAddNotification }) => {
    const [content, setContent] = useState('');
    const [files, setFiles] = useState<Array<{ name: string; url: string; type: 'pdf' | 'image' }>>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [savedDocs, setSavedDocs] = useState<DocumentItem[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const isCoupling = mode === 'coupling';
    const storageKey = isCoupling ? 'coupling_docs_history' : 'general_docs_history';

    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                setSavedDocs(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load docs", e);
        }
    }, [storageKey]);

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
        if (!content && files.length === 0) return;
        try {
            if (editingId) {
                const updatedList = savedDocs.map(doc => 
                    doc.id === editingId 
                    ? { ...doc, date, content, files } 
                    : doc
                );
                localStorage.setItem(storageKey, JSON.stringify(updatedList));
                setSavedDocs(updatedList);
                
                const notifTitle = isCoupling ? 'Cập nhật quy trình' : 'Cập nhật văn bản';
                const previewMsg = content.length > 50 ? content.substring(0, 50) + '...' : (content || 'Đã sửa nội dung');
                onAddNotification(notifTitle, previewMsg, {
                    content: content || '(Nội dung trong tệp đính kèm)',
                    files: files
                });

                showToast("Đã cập nhật văn bản!");
                handleCancelEdit();
            } else {
                const newDoc: DocumentItem = {
                    id: Date.now().toString(),
                    title: isCoupling ? 'Quy trình cắt nối' : 'Văn bản triển khai',
                    date: date,
                    content: content,
                    type: mode,
                    files: files
                };

                const updatedList = [newDoc, ...savedDocs];
                localStorage.setItem(storageKey, JSON.stringify(updatedList));
                setSavedDocs(updatedList);
                
                const notifTitle = isCoupling ? 'Quy trình mới' : 'Văn bản mới';
                const previewMsg = content.length > 50 ? content.substring(0, 50) + '...' : (content || 'Có tệp đính kèm mới');
                onAddNotification(notifTitle, previewMsg, {
                    content: content || '(Nội dung trong tệp đính kèm)',
                    files: files
                });

                setContent('');
                setFiles([]);
                showToast(isCoupling ? 'Đã lưu và gửi thông báo quy trình!' : 'Đã lưu và gửi thông báo văn bản!');
            }
        } catch (e) {
            alert("Bộ nhớ đầy! Vui lòng xóa bớt ảnh cũ hoặc giảm dung lượng file.");
        }
    };

    const handleEdit = (doc: DocumentItem) => {
        setEditingId(doc.id);
        setContent(doc.content);
        setDate(doc.date);
        setFiles(doc.files || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Đang sửa văn bản...');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setContent('');
        setFiles([]);
    };

    const handleDelete = (id: string) => {
        const updatedList = savedDocs.filter(d => d.id !== id);
        setSavedDocs(updatedList);
        localStorage.setItem(storageKey, JSON.stringify(updatedList));
        if (editingId === id) handleCancelEdit();
        showToast('Đã xóa văn bản');
    };

    const handleShare = async (doc: DocumentItem) => {
        let shareText = `📄 ${doc.title.toUpperCase()}\n`;
        shareText += `📅 Ngày: ${doc.date}\n`;
        shareText += `--------------------------------\n`;
        shareText += `${doc.content}\n`;

        // Generate Link with robust encoding
        const shareData = {
            type: 'document',
            title: doc.title,
            date: doc.date,
            content: doc.content
        };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
        const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;

        shareText += `\n📲 Truy cập nhanh: ${link}`;

        const filesToShare: File[] = [];
        const usedNames = new Set<string>();

        if (doc.files && doc.files.length > 0) {
            doc.files.forEach(f => {
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
                    title: doc.title,
                    text: shareText,
                };
                if (filesToShare.length > 0 && navigator.canShare && navigator.canShare({ files: filesToShare })) {
                    shareData.files = filesToShare;
                }
                await navigator.share(shareData);
                return;
            } catch (error) {
                console.log('Share canceled or failed:', error);
            }
        }
        
        alert('Đã sao chép nội dung văn bản! Bạn có thể dán vào tin nhắn.');
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <IconWrapper colorClass={isCoupling ? "bg-purple-100 text-purple-600" : "bg-amber-100 text-amber-600"}>
                        {isCoupling ? <LinkIcon className="w-6 h-6" /> : <Star className="w-6 h-6" />}
                    </IconWrapper>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{isCoupling ? 'Cắt Nối Xe' : 'Văn Bản Mới'}</h2>
                        <p className="text-sm text-gray-500">{isCoupling ? 'Quy trình & hướng dẫn kỹ thuật' : 'Tài liệu học tập & triển khai'}</p>
                    </div>
                </div>
                 {editingId && (
                     <button onClick={handleCancelEdit} className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center">
                        <X className="w-4 h-4 mr-1" /> Hủy sửa
                    </button>
                )}
            </div>

            <div className={`bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4 transition-all duration-300 ${editingId ? 'ring-2 ring-blue-400' : ''}`}>
                <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Ngày tháng</label>
                     <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-gray-800" />
                     </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">{isCoupling ? "Nội dung văn bản cắt nối toa xe" : "Nội dung văn bản"}</label>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={isCoupling ? 4 : 6} className="w-full p-4 rounded-xl bg-white border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-gray-800 placeholder:text-gray-400" placeholder={isCoupling ? "Nhập chi tiết quy trình cắt nối..." : "Nhập nội dung văn bản..."}></textarea>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <FileUpload accept="application/pdf" label="Thêm PDF" icon="pdf" onFileSelect={(f) => handleFileSelect(f, 'pdf')} />
                    <FileUpload accept="image/*" label="Thêm Ảnh" icon="image" onFileSelect={(f) => handleFileSelect(f, 'image')} />
                </div>
                {files.length > 0 && (
                    <div className="space-y-2 mt-4 bg-white p-3 rounded-xl border border-gray-100">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Tệp đính kèm đang soạn</label>
                        {files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    {file.type === 'pdf' ? <FileText className="w-6 h-6 text-red-500 flex-shrink-0" /> : <img src={file.url} alt="preview" className="w-6 h-6 rounded object-cover flex-shrink-0" />}
                                    <span className="text-sm font-medium truncate text-gray-700 max-w-[150px]">{file.name}</span>
                                </div>
                                <button type="button" onClick={(e) => removeFile(e, idx)} className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <button onClick={handleSave} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 ${isCoupling ? (editingId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200') : (editingId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200')}`}>
                {editingId ? <Edit2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                <span>{editingId ? 'Cập Nhật Thay Đổi' : (isCoupling ? 'Lưu Quy Trình' : 'Lưu Văn Bản')}</span>
            </button>

            {savedDocs.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center"><History className="w-5 h-5 mr-2 text-gray-500" />{isCoupling ? 'Lịch sử quy trình' : 'Lịch sử văn bản'}</h3>
                    <div className="space-y-4">
                        {savedDocs.map((doc) => (
                            <div key={doc.id} className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all group ${editingId === doc.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="w-full">
                                        <div className="inline-flex items-center text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md mb-2"><Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-500" />{doc.date}</div>
                                        <div className="text-sm font-medium text-gray-800 line-clamp-3 leading-relaxed">{doc.content}</div>
                                    </div>
                                    <div className="flex flex-col space-y-2 ml-2 flex-shrink-0">
                                         <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleEdit(doc); }} 
                                            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                                            title="Sửa"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleShare(doc); }} 
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Chia sẻ"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Xóa"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {doc.files && doc.files.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50">
                                        {doc.files.map((f, i) => (
                                            <div 
                                                key={i} 
                                                onClick={() => f.type === 'image' ? onImageClick(f.url) : openFileSafe(f.url, f.name)}
                                                className="flex items-center space-x-1 bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                            >
                                                {f.type === 'pdf' ? <FileText className="w-3.5 h-3.5 text-red-500" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                                                <span className="max-w-[120px] truncate">{f.name}</span>
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