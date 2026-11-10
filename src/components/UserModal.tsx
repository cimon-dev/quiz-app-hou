'use client';

import React, { useState, useEffect } from 'react';
import { User, Check, X } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  onUserSelected: (username: string) => void;
}

export default function UserModal({ isOpen, onClose, currentUser, onUserSelected }: UserModalProps) {
  const [nameInput, setNameInput] = useState('');
  const [existingUsers, setExistingUsers] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNameInput(currentUser || '');
      fetchExistingUsers();
    }
  }, [isOpen, currentUser]);

  const fetchExistingUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setExistingUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (selectedName?: string) => {
    const finalName = (selectedName || nameInput).trim();
    if (!finalName) return;

    setIsLoading(true);
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: finalName })
      });
      onUserSelected(finalName);
      onClose();
    } catch (e) {
      console.error(e);
      onUserSelected(finalName);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = existingUsers.filter(u =>
    u.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <User className="w-4 h-4 text-blue-600" />
            <span>Tên người dùng</span>
          </div>
          {currentUser && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập tên của bạn..."
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                autoFocus
              />
              <button
                onClick={() => handleSave()}
                disabled={isLoading || !nameInput.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận</span>
              </button>
            </div>
          </div>

          {existingUsers.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 mb-2">
                Hoặc chọn tên đã có ({existingUsers.length})
              </div>

              {existingUsers.length > 6 && (
                <input
                  type="text"
                  placeholder="Tìm tên..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="w-full mb-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredUsers.map(u => (
                  <button
                    key={u}
                    onClick={() => handleSave(u)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                      u.toLowerCase() === (currentUser || '').toLowerCase()
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{u}</span>
                    {u.toLowerCase() === (currentUser || '').toLowerCase() && (
                      <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Đang chọn
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
