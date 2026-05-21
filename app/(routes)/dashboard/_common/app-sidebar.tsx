import { Sidebar, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Calendar, CreditCard, Lightbulb, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import React from 'react'

const mainNav = [
  { name: "Ideas", href: "/ideas", icon: Lightbulb },
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];



const AppSidebar = () => {

    const pathname = usePathname();
    const {state} = useSidebar();
    const isCollapsed = state === "collapsed"
  return (
    <Sidebar collapsible='icon'>
        <SidebarHeader className={cn("p-4", isCollapsed && isCollapsed && "p-2" )}>
            <div className="flex items-center justify-between">
                
            </div>
        </SidebarHeader>
    </Sidebar>
  )
}

export default AppSidebar