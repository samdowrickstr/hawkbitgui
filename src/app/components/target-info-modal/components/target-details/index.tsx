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
    ];

    return <ListWithTitle title={'Details'} items={items} />;
}
