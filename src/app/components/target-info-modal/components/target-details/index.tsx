'use client';

import ListWithTitle from '@/app/components/list-with-title';

export default function TargetDetails({
    controllerId,
    lastPoll,
    nextExpectedPoll,
    pollOverdue,
    address,
    securityToken,
    description,
    createdAt,
    createdBy,
    lastModifiedAt,
    lastModifiedBy,
    product,
    os,
    servicePack,
    backend,
    dashboard,
    webui,
    watchdog,
    pilot,
    kernel,
    hwrev,
    abSlot,
}: {
    controllerId?: string;
    lastPoll?: Date;
    nextExpectedPoll?: Date;
    pollOverdue?: boolean;
    address?: string;
    securityToken?: string;
    description?: string;
    createdAt?: Date;
    createdBy?: string;
    lastModifiedAt?: Date;
    lastModifiedBy?: string;
    product?: string;
    os?: string;
    servicePack?: string;
    backend?: string;
    dashboard?: string;
    webui?: string;
    watchdog?: string;
    pilot?: string;
    kernel?: string;
    hwrev?: string;
    abSlot?: string;
}) {
    const items = [
        { title: 'Controller ID', value: controllerId },
        { title: 'Last Poll', value: lastPoll?.toLocaleString() },
        { title: 'Next Expected Poll', value: nextExpectedPoll?.toLocaleString() },
        { title: 'Poll Overdue', value: pollOverdue === undefined ? undefined : pollOverdue ? 'Yes' : 'No' },
        { title: 'Address', value: address },
        { title: 'Security Token', value: securityToken },
        { title: 'Description', value: description },
        { title: 'Created At', value: createdAt?.toLocaleString() },
        { title: 'Created By', value: createdBy },
        { title: 'Last Modified At', value: lastModifiedAt?.toLocaleString() },
        { title: 'Last Modified By', value: lastModifiedBy },
        { title: 'Product', value: product },
        { title: 'OS', value: os },
        { title: 'Service Pack', value: servicePack },
        { title: 'Dashboard', value: dashboard },
        { title: 'Backend', value: backend },
        { title: 'Web UI', value: webui },
        { title: 'Watchdog', value: watchdog },
        { title: 'Pilot', value: pilot },
        { title: 'Kernel', value: kernel },
        { title: 'Hardware Rev', value: hwrev },
        { title: 'Active Slot', value: abSlot },
    ];

    return <ListWithTitle title={'Details'} items={items} />;
}
