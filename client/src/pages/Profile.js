import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../assets/avatar.png';
import { API_URL } from '../config/api';

function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusError, setBonusError] = useState('');
  const [bonusSuccess, setBonusSuccess] = useState('');
  const [msLeft, setMsLeft] = useState(0);
  const [lastBonus, setLastBonus] = useState(user?.lastBonus);
  const [chips, setChips] = useState(user?.chips);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editUsername, setEditUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  useEffect(() => {
    setLastBonus(user?.lastBonus);
    setChips(user?.chips);
    setNewUsername(user?.username || '');
  }, [user]);

  useEffect(() => {
    let timer;
    if (msLeft > 0) {
      timer = setInterval(() => {
        setMsLeft((prev) => (prev > 1000 ? prev - 1000 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [msLeft]);

  const getTimeString = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleBonus = async () => {
    setBonusLoading(true);
    setBonusError('');
    setBonusSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/bonus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.msLeft) setMsLeft(data.msLeft);
        setBonusError(data.message || 'Помилка отримання бонусу');
      } else {
        setBonusSuccess(data.message);
        setChips(data.chips);
        setLastBonus(data.lastBonus);
        // Оновлюємо сторінку через 0.3 секунди після отримання бонусу
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (error) {
      setBonusError('Помилка при отриманні бонусу');
    } finally {
      setBonusLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Помилка при видаленні облікового запису');
      } else {
        alert('Обліковий запис успішно видалено!');
        logout();
        navigate('/');
      }
    } catch (e) {
      alert('Помилка сервера при видаленні облікового запису');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUsernameSave = async () => {
    if (!newUsername.trim() || newUsername === user.username) return;
    
    setUsernameLoading(true);
    setUsernameError('');
    setUsernameSuccess('');
    
    try {
      const response = await fetch(`${API_URL}/api/user/update-username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ username: newUsername })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setUsernameError(data.message || 'Помилка при оновленні імені');
        return;
      }
      
      setUsernameSuccess('Ім\'я користувача успішно оновлено');
      updateUser(data);
      setEditUsername(false);
      setNewUsername('');
    } catch (error) {
      setUsernameError('Помилка при оновленні імені');
    } finally {
      setUsernameLoading(false);
    }
  };

  // Перевіряємо, чи доступний бонус
  const isBonusAvailable = () => {
    if (!lastBonus) return true;
    const lastBonusTime = new Date(lastBonus);
    const now = new Date();
    const timeDiff = now - lastBonusTime;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff >= 24;
  };

  const getTimeUntilNextBonus = () => {
    if (!lastBonus) return null;
    const lastBonusTime = new Date(lastBonus);
    const nextBonusTime = new Date(lastBonusTime.getTime() + (24 * 60 * 60 * 1000));
    const now = new Date();
    
    if (now >= nextBonusTime) return null;
    
    const timeDiff = nextBonusTime - now;
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}г ${minutes}хв`;
  };

  if (!user) {
    return <div className="text-center">Завантаження профілю...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">Профіль</h1>
          
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-4 mb-6">
              <img 
                src={defaultAvatar} 
                alt="Аватар" 
                className="w-20 h-20 rounded-full"
              />
              <div>
                <h2 className="text-xl font-semibold">{user?.username}</h2>
                <p className="text-gray-400">{user?.email}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Ім'я користувача:</span>
                <div className="flex items-center">
                  <span className="text-white">{user?.username}</span>
                  <button
                    className="ml-2 text-gray-400 hover:text-gray-600 underline text-sm"
                    onClick={() => { setEditUsername(true); setUsernameError(''); setUsernameSuccess(''); }}
                  >Змінити</button>
                </div>
              </div>
              
              {editUsername && (
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Нове ім'я користувача"
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                        onClick={handleUsernameSave}
                        disabled={usernameLoading || !newUsername.trim() || newUsername === user.username}
                      >Зберегти</button>
                      <button
                        className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                        onClick={() => {
                          setEditUsername(false);
                          setNewUsername('');
                          setUsernameError('');
                          setUsernameSuccess('');
                        }}
                      >Скасувати</button>
                    </div>
                    {usernameError && <p className="text-red-400 text-sm">{usernameError}</p>}
                    {usernameSuccess && <p className="text-green-400 text-sm">{usernameSuccess}</p>}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Email:</span>
                <span className="text-white">{user?.email}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Фішки:</span>
                <span className="text-yellow-400 font-bold">{chips}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Останній бонус:</span>
                <span className="text-gray-400">
                  {lastBonus ? new Date(lastBonus).toLocaleDateString('uk-UA') : 'Ніколи'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Щоденний бонус</h3>
            
            {isBonusAvailable() ? (
              <button
                onClick={handleBonus}
                disabled={bonusLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-6 rounded-lg font-bold text-lg"
              >
                {bonusLoading ? 'Отримання...' : 'Отримати щоденний бонус'}
              </button>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 mb-2">Наступний бонус буде доступний через:</p>
                <p className="text-yellow-400 font-bold text-lg">{getTimeUntilNextBonus()}</p>
              </div>
            )}
            
            {bonusError && (
              <div className="mt-4 p-3 bg-red-600 rounded-lg">
                <p className="text-white">{bonusError}</p>
              </div>
            )}
            
            {bonusSuccess && (
              <div className="mt-4 p-3 bg-green-600 rounded-lg">
                <p className="text-white">{bonusSuccess}</p>
              </div>
            )}
          </div>

          {/* Блок видалення акаунту */}
          <div className="bg-red-900 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-red-400">Небезпечна зона</h3>
            <p className="text-gray-300 mb-4">
              Видалення акаунту призведе до безповоротної втрати всіх даних.
            </p>
            {!showDeleteConfirm ? (
              <button
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Видалити акаунт
              </button>
            ) : (
              <div className="bg-red-900 bg-opacity-20 border border-red-600 rounded-lg p-4">
                <p className="text-red-400 mb-4">
                  ⚠️ Ви впевнені, що хочете видалити свій обліковий запис? 
                  Ця дія є незворотною і всі ваші дані будуть втрачені назавжди!
                </p>
                <div className="flex gap-3">
                  <button
                    className={`bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors ${deleteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Видалення...' : 'Так, видалити назавжди'}
                  </button>
                  <button
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile; 