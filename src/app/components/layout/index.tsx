'use client';

import React, { ElementType, useState } from 'react';
import Link from 'next/link';
import styles from './styles.module.scss';
import Image from 'next/image';
import RocketIcon from '@/app/components/icons/rocket-icon';
import RolloutIcon from '@/app/components/icons/rollout-icon';
import UploadIcon from '@/app/components/icons/upload-icon';
import LogoutIcon from '@/app/components/icons/logout-icon';
import { usePathname } from 'next/navigation';
import ClickIcon from '@/app/components/icons/click-icon';
import WebIcon from '@/app/components/icons/web-icon';
import GearIcon from '@/app/components/icons/gear-icon';
import FolderIcon from '@/app/components/icons/folder-icon';
import CircleDotIcon from '@/app/components/icons/circle-dot-icon';
import { signOut, useSession } from 'next-auth/react';
import { AppRoutes } from '@/utils/routes';
import { hasPermission, primaryRoleLabel } from '@/utils/permissions';

export default function Layout({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { data: session } = useSession();

  const permissions = session?.user?.permissions ?? [];
  const navItems = [
    { href: '/x/fleet', label: 'Fleet', icon: CircleDotIcon, visible: hasPermission(permissions, 'READ_TARGET') },
    { href: '/x/deployment', label: 'Deployment', icon: RocketIcon, visible: hasPermission(permissions, ['READ_TARGET', 'READ_DISTRIBUTION_SET']) },
    { href: '/x/rollout', label: 'Rollout', icon: RolloutIcon, visible: hasPermission(permissions, 'READ_ROLLOUT') },
    { href: '/x/product-structure', label: 'Products', icon: FolderIcon, visible: hasPermission(permissions, ['READ_DISTRIBUTION_SET', 'READ_TARGET_TYPE']) },
    { href: '/x/service-packs', label: 'Service Packs', icon: UploadIcon, visible: hasPermission(permissions, 'UPDATE_TARGET') },
    { href: '/x/target-filters', label: 'Target filters', icon: ClickIcon, visible: hasPermission(permissions, 'READ_TARGET') },
    { href: '/x/distributions', label: 'Distributions', icon: WebIcon, visible: hasPermission(permissions, 'READ_DISTRIBUTION_SET') },
    { href: '/x/upload', label: 'Upload', icon: UploadIcon, visible: hasPermission(permissions, 'UPDATE_DISTRIBUTION_SET') },
    { href: '/x/configuration', label: 'Configuration', icon: GearIcon, visible: hasPermission(permissions, 'READ_TENANT_CONFIGURATION') },
    { href: '/x/admin/users', label: 'Admin Users', icon: GearIcon, visible: hasPermission(permissions, 'ROLE_TENANT_ADMIN') },
  ];

  const userInitial = session?.user?.username?.charAt(0)?.toUpperCase() || 'U';
  const roleLabel = primaryRoleLabel(permissions);

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.collapsed}`}>
        <div className={styles.sidebarHeader}>
          <a className={styles.brand}>
            <Image width={112} height={46} src={'/images/str-logo-dark.svg'} alt={'STR logo'} />
          </a>
        </div>

        <nav className={styles.nav}>
          {navItems.filter((item) => item.visible).map((item, i) => (
            <NavItem
              href={item.href}
              key={i}
              icon={item.icon}
              expanded={sidebarOpen}
              label={item.label}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </nav>

        <div className={styles.logout}>
          <NavItem href={AppRoutes.login} label='Logout' icon={LogoutIcon} expanded={sidebarOpen} onClick={() => signOut({ callbackUrl: AppRoutes.login })} />
        </div>
      </aside>

      {/* Main Content */}
      <div className={`${styles.main} ${sidebarOpen ? '' : styles.expanded}`}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.searchBar}>
            <input type='text' placeholder='Search' />
          </div>

          <div className={styles.headerActions}>
            <span className={styles.productName}>STR OTA Fleet</span>
            <div className={styles.userSummary}>
              <span>{session?.user?.username}</span>
              <small>{roleLabel}</small>
            </div>
            <div className={styles.profile}>{userInitial}</div>
          </div>
        </header>

        {/* Page Content */}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  expanded,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: ElementType;
  expanded: boolean;
  isActive?: boolean;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button className={`${styles.navItem} ${isActive ? styles.active : ''}`} onClick={onClick}>
        <Icon />
        {expanded && <span className={styles.label}>{label}</span>}
      </button>
    );
  }

  return (
    <Link href={href} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
      <Icon />
      {expanded && <span className={styles.label}>{label}</span>}
    </Link>
  );
}
