

export type Persona =
    | 'guest'
    | 'client'
    | 'partner'
    | 'sales'
    | 'customer'
    | 'coach'
    | 'admin'
    | 'technology'
    | 'business'
    | 'probono'
    | 'test'
    | 'PC'
    | 'cse'

export type ViewAsRules = Record<Persona, Persona[]>;

// Define NavBarItem type
export type NavBarItem = {
    id: number;
    icon: string;
    activeIcon: string;
    name: string;
    route: string;
    subItems?: NavBarItem[];
};

export type ViewAsRule = {
    persona: Persona;
    allowedTargets: Array<Persona | '*'>;
};

export const allPersonas: Persona[] = [
    'guest',
    'client',
    'partner',
    'sales',
    'customer',
    'coach',
    'admin',
    'technology',
    'business',
    'probono',
    'test',
    'PC',
    'cse'
];

export const viewAsRules: ViewAsRules = {
    guest: [],
    client: [],
    partner: [],
    sales: [],
    customer: [],
    coach: [],
    admin: ['*' as Persona],
    technology: [],
    business: [],
    probono: [],
    test: [],
    PC: [],
    cse: []
} as ViewAsRules;

export function isPersona(str: string): str is Persona {
    return allPersonas.includes(str as Persona);
}

export type RoleBasedMenu = Record<Persona, NavBarItem[]>

export const roleBasedMenus: RoleBasedMenu = {
    partner: [
        {
            id: 1,
            icon: 'user',
            activeIcon: 'user',
            name: 'Partner',
            route: '/partner-dashboard/profile?switch=partner',
        },
    ],
    coach: [
        {
            id: 2,
            icon: 'user',
            activeIcon: 'user',
            name: 'Coach',
            route: '/coach-dashboard/profile?switch=coach',
        },
    ],
    sales: [
        {
            id: 6,
            icon: 'user',
            activeIcon: 'user',
            name: 'Sales',
            route: '/sales-dashboard/profile?switch=sales',
        },
    ],
    cse: [
        {
            id: 7,
            icon: 'user',
            activeIcon: 'user',
            name: 'Customer',
            route: '/cse-dashboard/profile?switch=cse',
        },
    ],
    PC: [
        {
            id: 8,
            icon: 'user',
            activeIcon: 'user',
            name: 'Placement Controller',
            route: '/admin-dashboard/switch-persona?switch=assistant',
        },
    ],
    technology: [
        {
            id: 9,
            icon: 'user',
            activeIcon: 'user',
            name: 'Technology',
            route: '/admin-dashboard/switch-persona?switch=technology',
        },
    ],
    business: [
        {
            id: 10,
            icon: 'user',
            activeIcon: 'user',
            name: 'Business',
            route: '/admin-dashboard/switch-persona?switch=business',
        },
    ],
    admin: [
        {
            id: 11,
            icon: 'user',
            activeIcon: 'user',
            name: 'Admin',
            route: '/admin-dashboard/switch-persona?switch=admin',
        },
    ],
} as RoleBasedMenu;


export const getMergedMenu = (
    allowedPersonas: Persona[]
): NavBarItem[] => {
    const menuItemsMap = new Map<number, NavBarItem>();

    allowedPersonas?.forEach?.(persona => {
        let personaMenu = roleBasedMenus[persona];
        if (persona === '*' as Persona) {
            personaMenu = Object.values(roleBasedMenus).flatMap(nv => nv.map(v => v))
        }

        personaMenu?.forEach?.((item: NavBarItem) => {
            if (!menuItemsMap.has(item.id)) {
                menuItemsMap.set(item.id, { ...item });
            } else {
                // Merge subItems if the same menu item exists in multiple personas
                const existingItem = menuItemsMap.get(item.id)!;
                const mergedSubItems = [
                    ...(existingItem.subItems || []),
                    ...(item.subItems || [])
                ].reduce((acc, subItem) => {
                    if (!acc.some(i => i.id === subItem.id)) {
                        acc.push(subItem);
                    }
                    return acc;
                }, [] as NavBarItem[]);

                menuItemsMap.set(item.id, {
                    ...existingItem,
                    subItems: mergedSubItems.length > 0 ? mergedSubItems : undefined
                });
            }
        });
    });

    return Array.from(menuItemsMap.values());
};

export const getPersonaMenu = (
    persona: Persona
): NavBarItem[] => {
    return roleBasedMenus[persona] || [];
};

