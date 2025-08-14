
import React, { useState } from 'react';
import { AdminUser } from '../types';
import AdminDashboardSidebar from './AdminDashboardSidebar';
import AdminUserManagementScreen from './AdminUserManagementScreen';
import AdminContentModerationScreen from './AdminContentModerationScreen';
import AdminCampaignApprovalScreen from './AdminCampaignApprovalScreen';
import Icon from './Icon';

interface AdminDashboardProps {
    adminUser: AdminUser;
    onLogout: () => void;
}

type AdminView = 'dashboard' | 'users' | 'content' | 'campaigns';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminUser, onLogout }) => {
    const [activeView, setActiveView] = useState<AdminView>('dashboard');

    const renderView = () => {
        switch (activeView) {
            case 'users':
                return <AdminUserManagementScreen />;
            case 'content':
                return <AdminContentModerationScreen />;
            case 'campaigns':
                return <AdminCampaignApprovalScreen />;
            case 'dashboard':
            default:
                return (
                    <div className="p-8">
                        <h1 className="text-3xl font-bold text-slate-100">Welcome, Admin</h1>
                        <p className="text-slate-400 mt-2">Select a management tool from the sidebar to get started.</p>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-800 p-6 rounded-lg">
                                <Icon name="users" className="w-10 h-10 text-sky-400 mb-4"/>
                                <h2 className="text-xl font-bold">User Management</h2>
                                <p className="text-slate-400 mt-2">Ban users or apply comment suspensions.</p>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-lg">
                                <Icon name="trash" className="w-10 h-10 text-rose-400 mb-4"/>
                                <h2 className="text-xl font-bold">Content Moderation</h2>
                                <p className="text-slate-400 mt-2">Delete inappropriate posts or comments.</p>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-lg">
                                <Icon name="briefcase" className="w-10 h-10 text-emerald-400 mb-4"/>
                                <h2 className="text-xl font-bold">Campaign Approvals</h2>
                                <p className="text-slate-400 mt-2">Verify payments and approve new ad campaigns.</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="h-screen w-screen bg-slate-900 flex font-sans text-white">
            <AdminDashboardSidebar 
                adminUser={adminUser}
                activeView={activeView}
                onNavigate={setActiveView}
                onLogout={onLogout}
            />
            <main className="flex-grow overflow-hidden relative">
                <div className="h-full w-full absolute inset-0">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
