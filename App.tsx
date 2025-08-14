

import React, { useState, useEffect } from 'react';
import UserApp from './UserApp';
import AdminPortal from './components/AdminPortal';

const App: React.FC = () => {
    const [isAdminRoute, setIsAdminRoute] = useState(window.location.hash === '#/admin');

    useEffect(() => {
        const handleHashChange = () => {
            setIsAdminRoute(window.location.hash === '#/admin');
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Simple navigation hint for the developer/user
    useEffect(() => {
        if (!window.location.hash) {
            console.log("------------------------------------------");
            console.log("Welcome to VoiceBook!");
            console.log("To access the Admin Portal, append /#/admin to the URL.");
            console.log("------------------------------------------");
        }
    }, []);

    if (isAdminRoute) {
        return <AdminPortal />;
    }
    
    return <UserApp />;
};

export default App;