import React, { useState, useEffect, useRef } from 'react';
import { Contact, Phone, Plus, Trash2, Edit2, X, Save, Camera, Share2, MessageCircle } from 'lucide-react';
import { IconWrapper } from '../ui/IconWrapper';
import { CrewMember } from '../../types';

interface CrewViewProps {
    onImageClick?: (url: string) => void;
}

// Helper to show a non-blocking toast
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

// Helper to compress image (Resize to max 300px width, JPEG 0.7 quality)
// This prevents LocalStorage from filling up quickly
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxWidth = 300; // Resize to small avatar size
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
                    // Fill white background (handles PNG transparency)
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG with 0.7 quality
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); 
                } else {
                    reject(new Error("Canvas context error"));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const INITIAL_CREW: CrewMember[] = [];

// Zalo link generator
const getZaloLink = (phone: string) => `https://zalo.me/${phone}`;

const MemberDetailModal: React.FC<{ 
    member: CrewMember | null; 
    onClose: () => void; 
    onEdit: (m: CrewMember) => void; 
    onDelete: (id: string) => void;
    onImageClick?: (url: string) => void;
}> = ({ member, onClose, onEdit, onDelete, onImageClick }) => {
    if (!member) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Background */}
                <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
                     <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 pb-6 relative">
                    {/* Avatar */}
                    <div className="flex justify-center -mt-12 mb-4">
                        <img 
                            src={member.avatar} 
                            alt={member.name} 
                            className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-100 object-cover cursor-pointer"
                            onClick={() => onImageClick?.(member.avatar)}
                        />
                    </div>

                    {/* Info */}
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide">
                            {member.role}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 mb-6">
                        <a href={`tel:${member.phone}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors group">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-200 transition-colors">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Điện thoại</p>
                                    <p className="font-bold text-gray-800">{member.phone}</p>
                                </div>
                            </div>
                        </a>
                        
                        <a href={getZaloLink(member.zalo || member.phone)} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors group">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-200 transition-colors">
                                    <MessageCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Zalo</p>
                                    <p className="font-bold text-gray-800">{member.zalo || member.phone}</p>
                                </div>
                            </div>
                        </a>
                    </div>

                    {/* Edit/Delete */}
                    <div className="flex space-x-3 pt-4 border-t border-gray-100">
                         <button 
                            onClick={() => { onClose(); onEdit(member); }}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 flex items-center justify-center space-x-2"
                        >
                            <Edit2 className="w-4 h-4" /> <span>Sửa</span>
                        </button>
                        <button 
                            onClick={() => { onClose(); onDelete(member.id); }}
                            className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 flex items-center justify-center space-x-2"
                        >
                            <Trash2 className="w-4 h-4" /> <span>Xóa</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const CrewView: React.FC<CrewViewProps> = ({ onImageClick }) => {
    // Initialize from LocalStorage or fallback to INITIAL_CREW
    const [crew, setCrew] = useState<CrewMember[]>(() => {
        const saved = localStorage.getItem('crew_list');
        return saved ? JSON.parse(saved) : INITIAL_CREW;
    });
    
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newMember, setNewMember] = useState<Partial<CrewMember>>({});
    const [viewingMember, setViewingMember] = useState<CrewMember | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Save to LocalStorage whenever crew list changes
    useEffect(() => {
        try {
            localStorage.setItem('crew_list', JSON.stringify(crew));
        } catch (error) {
            console.error("Lỗi lưu trữ:", error);
            alert("Bộ nhớ đầy! Không thể lưu thêm thành viên. Vui lòng xóa bớt hoặc sử dụng ảnh dung lượng thấp hơn.");
        }
    }, [crew]);

    const handleDelete = (id: string) => {
        // Direct delete without confirm
        setCrew(prev => prev.filter(m => m.id !== id));
        // If deleting the item currently being edited, reset edit state
        if (editingId === id) {
            handleCancel();
        }
        showToast('Đã xóa thành viên');
    };

    const handleEdit = (member: CrewMember) => {
        setNewMember(member);
        setEditingId(member.id);
        setIsAdding(true);
        // Optional: scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Đang sửa thông tin...');
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                // Compress image to save storage space
                const base64 = await compressImage(e.target.files[0]);
                setNewMember(prev => ({ ...prev, avatar: base64 }));
            } catch (err) {
                alert("Lỗi khi tải ảnh. Vui lòng thử ảnh khác.");
            }
        }
    };

    const handleSave = () => {
        // Validate inputs
        if (!newMember.name || !newMember.name.trim()) {
            alert("Vui lòng nhập tên thành viên");
            return;
        }
        if (!newMember.phone || !newMember.phone.trim()) {
            alert("Vui lòng nhập số điện thoại");
            return;
        }

        if (editingId) {
            // Update existing member
            setCrew(prev => prev.map(m => 
                m.id === editingId ? { ...m, ...newMember, id: m.id } as CrewMember : m
            ));
            showToast("Đã cập nhật thông tin!");
        } else {
            // Add new member
            const member: CrewMember = {
                id: Date.now().toString(),
                name: newMember.name.trim(),
                phone: newMember.phone.trim(),
                zalo: newMember.zalo || newMember.phone.trim(), // Default Zalo to Phone
                // Use uploaded avatar OR random fallback
                avatar: newMember.avatar || `https://picsum.photos/200/200?random=${Date.now()}`,
                role: newMember.role || 'Nhân viên'
            };
            setCrew(prev => [member, ...prev]); // Add new member to top
            showToast("Đã thêm thành viên mới!");
        }
        
        handleCancel();
    };

    const handleCancel = () => {
        setNewMember({});
        setEditingId(null);
        setIsAdding(false);
    };

    const handleShareList = async () => {
        if (crew.length === 0) {
            alert("Danh sách trống!");
            return;
        }

        const date = new Date().toLocaleDateString('vi-VN');
        let text = `📋 DANH SÁCH TỔ TÀU (${date})\n`;
        text += `--------------------------------\n`;
        crew.forEach((m, index) => {
            text += `${index + 1}. ${m.name}\n   - Chức vụ: ${m.role}\n   - SĐT: ${m.phone}\n\n`;
        });
        
        // Generate Link with robust encoding
        const shareData = {
            type: 'crew',
            list: crew.map(c => ({ name: c.name, role: c.role, phone: c.phone }))
        };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
        const link = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
        
        text += `\n📲 Truy cập nhanh: ${link}`;
        
        try {
            await navigator.clipboard.writeText(text);
            showToast("Đã sao chép nội dung & link! Dán nếu bị mất.");
        } catch (err) {
            console.error("Clipboard write failed", err);
        }
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Danh sách tổ tàu (${date})`,
                    text: text
                });
                return;
            } catch (err) {
                console.log('Share canceled/failed, falling back to clipboard');
            }
        }
        
        alert("Đã sao chép danh sách thành viên vào bộ nhớ tạm! Bạn có thể dán vào Zalo/Tin nhắn.");
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <IconWrapper colorClass="bg-emerald-100 text-emerald-600">
                        <Contact className="w-6 h-6" />
                    </IconWrapper>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Tổ Tàu</h2>
                        <p className="text-sm text-gray-500">{crew.length} thành viên</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    {crew.length > 0 && (
                        <button 
                            onClick={handleShareList}
                            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 active:scale-90 transition-all"
                            title="Sao chép danh sách"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            if (isAdding) handleCancel();
                            else setIsAdding(true);
                        }}
                        className={`w-10 h-10 ${isAdding ? 'bg-gray-100 text-gray-500' : 'bg-emerald-600 text-white'} rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-90 transition-all`}
                    >
                        {isAdding ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Add/Edit Form */}
            {isAdding && (
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 relative">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center justify-between">
                        <div className="flex items-center">
                            {editingId ? <Edit2 className="w-4 h-4 mr-2 text-blue-500" /> : <Plus className="w-4 h-4 mr-2 text-emerald-500" />}
                            {editingId ? 'Cập nhật thông tin' : 'Thêm thành viên mới'}
                        </div>
                    </h3>
                    
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center justify-center mb-6">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                        <div 
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-md bg-gray-50">
                                {newMember.avatar ? (
                                    <img src={newMember.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                                        <Camera className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-blue-700 transition-colors">
                                <Camera className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 font-medium">Chạm để chọn ảnh</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Họ và tên <span className="text-red-500">*</span></label>
                            <input 
                                placeholder="Nhập họ tên..." 
                                className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all placeholder:text-gray-400"
                                value={newMember.name || ''}
                                onChange={e => setNewMember({...newMember, name: e.target.value})}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Chức danh</label>
                            <input 
                                placeholder="VD: Trưởng tàu, Nhân viên..." 
                                className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all placeholder:text-gray-400"
                                value={newMember.role || ''}
                                onChange={e => setNewMember({...newMember, role: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Số điện thoại <span className="text-red-500">*</span></label>
                                <input 
                                    placeholder="Nhập SĐT..." 
                                    type="tel"
                                    className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all placeholder:text-gray-400"
                                    value={newMember.phone || ''}
                                    onChange={e => setNewMember({...newMember, phone: e.target.value})}
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Số Zalo</label>
                                <input 
                                    placeholder="Nhập Zalo..." 
                                    type="tel"
                                    className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all placeholder:text-gray-400"
                                    value={newMember.zalo || ''}
                                    onChange={e => setNewMember({...newMember, zalo: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-4 border-t border-gray-50 mt-2">
                             <button 
                                onClick={handleCancel}
                                className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                onClick={handleSave}
                                className={`flex-1 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2 ${editingId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                            >
                                <Save className="w-4 h-4" />
                                <span>{editingId ? 'Lưu thay đổi' : 'Lưu thành viên'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {crew.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 border-dashed">
                    <Contact className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">Chưa có thành viên nào</p>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="text-emerald-600 font-bold text-sm mt-2 hover:underline"
                    >
                        + Thêm thành viên ngay
                    </button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {crew.map((member) => (
                        <div 
                            key={member.id} 
                            onClick={() => setViewingMember(member)}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group relative overflow-hidden hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="relative flex-shrink-0">
                                    <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm bg-gray-100" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate text-base">{member.name}</h3>
                                    <p className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit mb-1">{member.role}</p>
                                    <div className="flex items-center space-x-3 text-gray-400">
                                        <div className="flex items-center space-x-1">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span className="text-xs">{member.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col space-y-2 pl-2">
                                <a 
                                    href={getZaloLink(member.zalo || member.phone)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()} 
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            <MemberDetailModal 
                member={viewingMember} 
                onClose={() => setViewingMember(null)} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                onImageClick={onImageClick}
            />
        </div>
    );
};