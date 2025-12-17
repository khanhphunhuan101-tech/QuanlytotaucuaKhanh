import React, { useState, useEffect } from 'react';
import { AssignmentView } from './components/features/AssignmentView';
import { BriefingView } from './components/features/BriefingView';
import { DocumentManager } from './components/features/DocumentManager';
import { IncidentReport } from './components/features/IncidentReport';
import { CrewView } from './components/features/CrewView';
import { CalendarDays, Users, FileText, Link as LinkIcon, AlertTriangle, Contact, Bell, X, Home, Trash2, Eye, FileText as FileTextIcon, Download, Share2, Clock, CheckCircle2 } from 'lucide-react';
import { ViewState } from './types';

// Helper to open Base64 files properly
const openBase64File = (base64Data: string, fileName: string) => {
    try {
        const arr = base64Data.split(',');
        if (arr.length < 2) throw new Error("File data corrupted");
        
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        
        if (mime === 'application/pdf') {
            const newWindow = window.open(blobUrl, '_blank');
            if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
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
        console.error(e);
        alert("Không thể mở file. Dữ liệu có thể bị lỗi.");
    }
};

// Robust decoding function for UTF-8 strings
const decodeShareData = (str: string) => {
    try {
        // Standardize base64 string (handle URL safe variants if necessary)
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        // Decode: Base64 -> Binary String -> Percent-encoded String -> Original UTF-8 String
        return JSON.parse(decodeURIComponent(escape(atob(base64))));
    } catch (e) { 
        console.error("Decode failed", e);
        return null; 
    }
};

const ImageModal: React.FC<{ url: string | null; onClose: () => void }> = ({ url, onClose }) => {
    if (!url) return null;
    return (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 animate-in fade-in duration-200" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white p-2 bg-black/20 rounded-full">
                <X className="w-8 h-8" />
            </button>
            <img 
                src={url} 
                alt="Fullscreen" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
                onClick={(e) => e.stopPropagation()} 
            />
        </div>
    );
};

interface Notification {
    id: number;
    title: string;
    msg: string;
    time: string;
    read: boolean;
    details?: {
        content: string;
        files: Array<{ name: string; url: string; type: 'pdf' | 'image' }>;
    };
}

const NotificationDetailModal: React.FC<{
    notification: Notification | null;
    onClose: () => void;
    onImageClick: (url: string) => void;
}> = ({ notification, onClose, onImageClick }) => {
    if (!notification) return null;

    const handleViewFile = (url: string, name: string, type: 'pdf' | 'image') => {
        if (type === 'image') {
            onImageClick(url);
        } else {
            openBase64File(url, name);
        }
    };

    return (
         <div className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">Chi tiết thông báo</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="mb-4">
                        <h4 className="text-xl font-bold text-blue-600 mb-1">{notification.title}</h4>
                        <span className="text-xs text-gray-400 font-medium">{notification.time}</span>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                         <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                            {notification.details ? notification.details.content : notification.msg}
                        </p>
                    </div>

                    {notification.details && notification.details.files && notification.details.files.length > 0 && (
                        <div>
                            <h5 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Tệp đính kèm</h5>
                            <div className="grid gap-2">
                                {notification.details.files.map((file, index) => (
                                    <button 
                                        key={index}
                                        onClick={() => handleViewFile(file.url, file.name, file.type)}
                                        className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors text-left w-full group"
                                    >
                                        {file.type === 'pdf' ? (
                                            <FileTextIcon className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                                        ) : (
                                            <Eye className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0 mr-2">
                                            <span className="text-sm font-medium text-blue-700 truncate block">{file.name}</span>
                                        </div>
                                        {file.type === 'pdf' && <Download className="w-4 h-4 text-gray-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                    <button 
                        onClick={onClose}
                        className="text-gray-500 font-medium text-sm hover:text-gray-800"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

const NotificationModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void;
    notifications: Notification[];
    onDelete: (id: number) => void;
    onClearAll: () => void;
    onSelect: (notif: Notification) => void;
}> = ({ isOpen, onClose, notifications, onDelete, onClearAll, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <Bell className="w-5 h-5 text-blue-600" />
                        Thông báo ({notifications.length})
                    </h3>
                    <div className="flex items-center gap-2">
                         {notifications.length > 0 && (
                            <button 
                                onClick={onClearAll}
                                className="text-xs font-medium text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            >
                                Xóa tất cả
                            </button>
                        )}
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                            <Bell className="w-12 h-12 text-gray-300 mb-2" />
                            <p>Không có thông báo mới</p>
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div 
                                key={notif.id} 
                                onClick={() => onSelect(notif)}
                                className={`p-4 border-b border-gray-50 hover:bg-gray-50 active:bg-blue-50 transition-colors flex gap-3 group relative cursor-pointer ${!notif.read ? 'bg-blue-50/50' : ''}`}
                            >
                                <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${!notif.read ? 'bg-blue-600' : 'bg-gray-300'}`} />
                                <div className="flex-1 pr-6">
                                    <h4 className={`text-sm mb-0.5 ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                        {notif.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 leading-relaxed mb-1 line-clamp-2">{notif.msg}</p>
                                    <span className="text-xs text-gray-400 font-medium">{notif.time}</span>
                                </div>
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
                                    className="absolute right-2 top-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const SharedContentView: React.FC<{ data: any; onClose: () => void }> = ({ data, onClose }) => {
    if (!data) return null;

    let title = "Nội dung chia sẻ";
    let icon = <Share2 className="w-6 h-6 text-blue-600" />;
    
    // Determine header based on type
    if (data.type === 'assignment') { title = "Phân Công Tàu " + (data.trainId || ''); icon = <CalendarDays className="w-6 h-6 text-blue-600" />; }
    else if (data.type === 'briefing') { title = "Nội Dung Giao Ban"; icon = <Users className="w-6 h-6 text-indigo-600" />; }
    else if (data.type === 'incident') { title = "Báo Cáo Sự Cố"; icon = <AlertTriangle className="w-6 h-6 text-red-600" />; }
    else if (data.type === 'document') { title = data.title || "Văn Bản"; icon = <FileText className="w-6 h-6 text-amber-600" />; }
    else if (data.type === 'crew') { title = "Danh Sách Tổ Tàu"; icon = <Contact className="w-6 h-6 text-emerald-600" />; }

    return (
        <div className="fixed inset-0 z-[80] bg-gray-50 flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="bg-white p-4 shadow-sm border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">{icon}</div>
                    <div>
                        <h2 className="font-bold text-lg text-gray-900">{title}</h2>
                        <p className="text-xs text-gray-500">Được chia sẻ từ ứng dụng</p>
                    </div>
                </div>
                <button onClick={onClose} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-gray-800 transition-all">
                    Đóng & Vào App
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                    {/* Timestamp/Date Header */}
                    {(data.date || data.timestamp) && (
                        <div className="flex items-center text-sm font-medium text-gray-500 mb-2">
                            <Clock className="w-4 h-4 mr-1.5" />
                            {data.date || data.timestamp}
                        </div>
                    )}

                    {/* Content Rendering based on Type */}
                    {data.type === 'assignment' && (
                        <div>
                            <div className="text-lg font-bold text-gray-800 mb-2">Nội dung:</div>
                            <p className="whitespace-pre-line text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">{data.content || "Không có nội dung văn bản"}</p>
                        </div>
                    )}

                    {data.type === 'briefing' && (
                        <div className="space-y-4">
                            {data.review && (
                                <div>
                                    <div className="font-bold text-orange-600 mb-1">Rút kinh nghiệm:</div>
                                    <p className="whitespace-pre-line text-gray-700 bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">{data.review}</p>
                                </div>
                            )}
                            {data.plan && (
                                <div>
                                    <div className="font-bold text-teal-600 mb-1">Triển khai mới:</div>
                                    <p className="whitespace-pre-line text-gray-700 bg-teal-50/50 p-3 rounded-xl border border-teal-100/50">{data.plan}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {data.type === 'incident' && (
                        <div>
                            <div className="text-lg font-bold text-red-600 mb-2">Mô tả sự cố:</div>
                            <p className="whitespace-pre-line text-gray-800 leading-relaxed bg-red-50 p-4 rounded-xl border border-red-100">{data.description || "Không có mô tả chi tiết"}</p>
                        </div>
                    )}

                    {data.type === 'document' && (
                        <div>
                            <div className="text-lg font-bold text-gray-800 mb-2">Nội dung văn bản:</div>
                            <p className="whitespace-pre-line text-gray-700 leading-relaxed">{data.content || "Không có nội dung"}</p>
                        </div>
                    )}

                    {data.type === 'crew' && Array.isArray(data.list) && (
                        <div className="space-y-3">
                            {data.list.map((m: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">{m.name.charAt(0)}</div>
                                        <div>
                                            <div className="font-bold text-gray-900">{m.name}</div>
                                            <div className="text-xs text-emerald-600 font-medium">{m.role}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500 font-mono">{m.phone}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* File Warning */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-start space-x-3 bg-blue-50 p-4 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-blue-800 font-medium">Lưu ý về tệp đính kèm</p>
                            <p className="text-xs text-blue-600 mt-1">
                                Ảnh và tệp đính kèm (nếu có) không được hiển thị trong liên kết nhanh này. 
                                Vui lòng kiểm tra tệp đính kèm trong tin nhắn gốc (Zalo/Messenger).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DashboardView: React.FC<{ onNavigate: (view: ViewState) => void; onOpenNotif: () => void; unreadCount: number }> = ({ onNavigate, onOpenNotif, unreadCount }) => {
    const items = [
        { id: 'assignment', label: 'Phân công', icon: CalendarDays, cardBg: 'bg-blue-50 border-blue-100 hover:bg-blue-100', iconColor: 'text-blue-600' },
        { id: 'briefing', label: 'Giao ban', icon: Users, cardBg: 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100', iconColor: 'text-indigo-600' },
        { id: 'new-docs', label: 'Văn bản', icon: FileText, cardBg: 'bg-amber-50 border-amber-100 hover:bg-amber-100', iconColor: 'text-amber-600' },
        { id: 'coupling-docs', label: 'Cắt nối', icon: LinkIcon, cardBg: 'bg-purple-50 border-purple-100 hover:bg-purple-100', iconColor: 'text-purple-600' },
        { id: 'incident', label: 'Sự cố', icon: AlertTriangle, cardBg: 'bg-red-50 border-red-100 hover:bg-red-100', iconColor: 'text-red-600' },
        { id: 'crew', label: 'Tổ tàu', icon: Contact, cardBg: 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100', iconColor: 'text-emerald-600' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-lg shadow-blue-200 relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl -ml-10 -mb-10"></div>
                <div className="relative">
                    <h2 className="text-3xl font-bold mb-1">Xin chào! 👋</h2>
                    <p className="text-blue-100 opacity-90 font-medium">Chúc bạn một ca làm việc an toàn.</p>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-2"></span>
                    Chức năng chính
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id as ViewState)}
                            className={`flex flex-col items-center p-3 py-5 rounded-3xl shadow-sm border transition-all duration-300 active:scale-95 group ${item.cardBg}`}
                        >
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-md shadow-gray-200/50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                                <item.icon className={`w-9 h-9 ${item.iconColor} drop-shadow-sm`} strokeWidth={2} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 text-center leading-tight uppercase tracking-wide group-hover:text-blue-700 transition-colors">
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div 
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between group cursor-pointer hover:border-blue-200 transition-all"
                onClick={onOpenNotif}
            >
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 relative">
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>}
                    </div>
                    <div>
                        <div className="font-bold text-gray-800 text-sm">Thông báo mới</div>
                        <div className="text-gray-500 text-xs">{unreadCount > 0 ? `${unreadCount} tin mới chưa đọc` : 'Không có tin mới'}</div>
                    </div>
                </div>
                <div className="text-blue-500 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-full group-hover:bg-blue-100 transition-colors">
                    Xem ngay
                </div>
            </div>
        </div>
    );
};

export default function App() {
    const [activeTab, setActiveTab] = useState<ViewState>('home');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [sharedData, setSharedData] = useState<any | null>(null);
    const [decodeError, setDecodeError] = useState<boolean>(false);

    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const saved = localStorage.getItem('notifications_data');
        if (saved) return JSON.parse(saved);
        return []; 
    });

    useEffect(() => {
        localStorage.setItem('notifications_data', JSON.stringify(notifications));
    }, [notifications]);

    // Check for shared content in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const shareCode = params.get('share');
        if (shareCode) {
            const data = decodeShareData(shareCode);
            if (data) {
                setSharedData(data);
                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);
            } else {
                setDecodeError(true);
                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, []);

    // Show toast if decode fails
    useEffect(() => {
        if (decodeError) {
             const div = document.createElement('div');
            div.className = 'fixed top-5 left-1/2 -translate-x-1/2 bg-red-900/90 text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg z-[100] transition-all duration-300 backdrop-blur-sm animate-in fade-in slide-in-from-top-4';
            div.innerHTML = `<div class="flex items-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg><span>Liên kết chia sẻ bị lỗi hoặc không hợp lệ</span></div>`;
            document.body.appendChild(div);
            setTimeout(() => {
                div.classList.add('opacity-0', '-translate-y-4');
                setTimeout(() => document.body.removeChild(div), 300);
            }, 4000);
            setDecodeError(false);
        }
    }, [decodeError]);


    const handleAddNotification = (title: string, msg: string, details?: { content: string, files: any[] }) => {
        const newNotif: Notification = {
            id: Date.now(),
            title,
            msg,
            time: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
            read: false,
            details: details 
        };
        setNotifications(prev => [newNotif, ...prev]);
    };

    const handleDeleteNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleClearAllNotifications = () => {
        if (window.confirm('Bạn muốn xóa tất cả thông báo?')) {
            setNotifications([]);
        }
    };

    const handleSelectNotification = (notif: Notification) => {
        const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n);
        setNotifications(updated);
        setSelectedNotification(notif);
        setShowNotifications(false);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <DashboardView onNavigate={setActiveTab} onOpenNotif={() => setShowNotifications(true)} unreadCount={unreadCount} />;
            case 'assignment': return <AssignmentView onAddNotification={handleAddNotification} onImageClick={setPreviewImage} />;
            case 'briefing': return <BriefingView onAddNotification={handleAddNotification} onImageClick={setPreviewImage} />;
            case 'new-docs': return <DocumentManager mode="general" onImageClick={setPreviewImage} onAddNotification={handleAddNotification} />;
            case 'coupling-docs': return <DocumentManager mode="coupling" onImageClick={setPreviewImage} onAddNotification={handleAddNotification} />;
            case 'incident': return <IncidentReport onImageClick={setPreviewImage} onAddNotification={handleAddNotification} />;
            case 'crew': return <CrewView onImageClick={setPreviewImage} />;
            default: return <DashboardView onNavigate={setActiveTab} onOpenNotif={() => setShowNotifications(true)} unreadCount={unreadCount} />;
        }
    };

    const navItems = [
        { id: 'home', label: 'Trang chủ', icon: Home },
        { id: 'assignment', label: 'Phân công', icon: CalendarDays },
        { id: 'briefing', label: 'Giao ban', icon: Users },
        { id: 'new-docs', label: 'Văn bản', icon: FileText },
        { id: 'coupling-docs', label: 'Cắt nối', icon: LinkIcon },
        { id: 'incident', label: 'Sự cố', icon: AlertTriangle },
        { id: 'crew', label: 'Tổ tàu', icon: Contact },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {sharedData && <SharedContentView data={sharedData} onClose={() => setSharedData(null)} />}
            
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 shadow-sm transition-all">
                <div className="flex items-center justify-between max-w-2xl mx-auto w-full">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-white">
                                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                                <path d="M12 12v9" />
                                <path d="m8 17 4 4 4-4" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="font-black text-xl leading-none text-orange-600 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.1)]">QUẢN LÝ TỔ TÀU</h1>
                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-0.5">( Mr Khanh )</span>
                        </div>
                    </div>
                    <button onClick={() => setShowNotifications(true)} className="relative p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>}
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar">
                <div className="max-w-2xl mx-auto w-full p-4">
                    {renderContent()}
                </div>
            </main>

            <nav className="sticky bottom-0 z-50 bg-white border-t border-gray-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)]">
                <div className="max-w-2xl mx-auto w-full px-2 py-2">
                    <div className="flex items-center justify-between overflow-x-auto no-scrollbar space-x-2 px-2">
                        {navItems.map((item) => {
                            const isActive = activeTab === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as ViewState)}
                                    className={`relative flex flex-col items-center justify-center min-w-[64px] py-1 transition-all duration-300 rounded-xl ${
                                        isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon className={`w-6 h-6 mb-1 transition-all ${isActive ? 'scale-110 drop-shadow-sm' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className={`text-[9px] font-bold tracking-wide transition-all ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            <ImageModal url={previewImage} onClose={() => setPreviewImage(null)} />
            <NotificationModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onDelete={handleDeleteNotification} onClearAll={handleClearAllNotifications} onSelect={handleSelectNotification} />
            <NotificationDetailModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} onImageClick={setPreviewImage} />
        </div>
    );
}