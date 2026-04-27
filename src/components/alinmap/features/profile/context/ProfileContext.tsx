import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface ProfileContextType {
    myStatus: string;
    setMyStatus: React.Dispatch<React.SetStateAction<string>>;
    isVisibleOnMap: boolean;
    setIsVisibleOnMap: React.Dispatch<React.SetStateAction<boolean>>;
    isReporting: boolean;
    setIsReporting: React.Dispatch<React.SetStateAction<boolean>>;
    reportReason: string;
    setReportReason: React.Dispatch<React.SetStateAction<string>>;
    reportStatus: string;
    setReportStatus: React.Dispatch<React.SetStateAction<string>>;
    isEditingStatus: boolean;
    setIsEditingStatus: React.Dispatch<React.SetStateAction<boolean>>;
    isEditingName: boolean;
    setIsEditingName: React.Dispatch<React.SetStateAction<boolean>>;
    nameInput: string;
    setNameInput: React.Dispatch<React.SetStateAction<string>>;
    statusInput: string;
    setStatusInput: React.Dispatch<React.SetStateAction<string>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode, initialIsVisible: boolean, initialStatus?: string }> = ({ children, initialIsVisible, initialStatus = "" }) => {
    const [myStatus, setMyStatus] = useState(initialStatus);
    const [isVisibleOnMap, setIsVisibleOnMap] = useState<boolean>(initialIsVisible);

    useEffect(() => {
        setMyStatus(initialStatus);
    }, [initialStatus]);

    useEffect(() => {
        localStorage.setItem('alinmap_visible', String(isVisibleOnMap));
    }, [isVisibleOnMap]);

    const [isReporting, setIsReporting] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportStatus, setReportStatus] = useState("");
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [statusInput, setStatusInput] = useState("");

    return (
        <ProfileContext.Provider value={{
            myStatus, setMyStatus,
            isVisibleOnMap, setIsVisibleOnMap,
            isReporting, setIsReporting,
            reportReason, setReportReason,
            reportStatus, setReportStatus,
            isEditingStatus, setIsEditingStatus,
            isEditingName, setIsEditingName,
            nameInput, setNameInput,
            statusInput, setStatusInput
        }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};
