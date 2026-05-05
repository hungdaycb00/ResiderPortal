import type React from 'react';
import AlinMapInner from './alinmap/AlinMapInner';
import type { AlinMapProps } from './alinmap/constants';
import LooterGameUI from './alinmap/looter-game/LooterGameUI';
import LooterGameProvider from './alinmap/looter-game/LooterGameProvider';

const AlinMap: React.FC<AlinMapProps> = (props) => {
    const activeDeviceId = props.externalApi.getDeviceId();

    return (
        <LooterGameProvider deviceId={activeDeviceId} showNotification={props.showNotification || (() => {})}>
            <LooterGameUI />
            <AlinMapInner {...props} />
        </LooterGameProvider>
    );
};

export default AlinMap;
