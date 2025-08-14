
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { geminiService } from '../services/geminiService';

const AdminUserManagementScreen: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const allUsers = await geminiService.getAllUsersForAdmin();
        setUsers(allUsers);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleBanToggle = async (user: User) => {
        const action = user.isBanned ? 'unban' : 'ban';
        if (window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
            const success = user.isBanned ? await geminiService.unbanUser(user.id) : await geminiService.banUser(user.id);
            if (success) fetchUsers();
        }
    };
    
    const handleCommentSuspensionToggle = async (user: User) => {
        const isSuspended = user.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date();
        const action = isSuspended ? 'lift the suspension for' : 'suspend commenting for 2 days for';
        if (window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
            const success = isSuspended ? await geminiService.liftUserCommentingSuspension(user.id) : await geminiService.suspendUserCommenting(user.id, 2);
             if (success) fetchUsers();
        }
    };
    
    const UserStatusBadge = ({ user }: { user: User }) => {
        if (user.isBanned) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">Banned</span>;
        }
        if (user.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date()) {
            const date = new Date(user.commentingSuspendedUntil);
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-400" title={`Suspended until ${date.toLocaleString()}`}>Suspended</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">Active</span>;
    };


    if (isLoading) {
        return <p className="p-8 text-slate-400">Loading users...</p>;
    }
    
    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-slate-100">User Management</h1>
                <p className="text-slate-400 mb-8">Apply bans or other restrictions to users.</p>
                
                <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead className="bg-slate-800">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-slate-800/50 divide-y divide-slate-700">
                                {users.map(user => {
                                    const isSuspended = user.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date();
                                    return (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-slate-100">{user.name}</div>
                                                        <div className="text-sm text-slate-400">{user.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <UserStatusBadge user={user} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleBanToggle(user)}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${user.isBanned ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} text-white`}
                                                    >
                                                        {user.isBanned ? 'Unban' : 'Ban'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCommentSuspensionToggle(user)}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isSuspended ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'} text-white`}
                                                    >
                                                         {isSuspended ? 'Lift Suspension' : 'Suspend Comments (2d)'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUserManagementScreen;
