const COMMON_CITY_HINTS = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Chennai', 'Pune'];
const COMMON_LANGUAGE_HINTS = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada'];

const ROLE_CATALOG = [
    {
        title: 'Delivery Executive',
        aliases: ['Delivery Partner', 'Driver', 'Last Mile Associate'],
        category: 'Logistics',
        skills: ['Route planning', 'Customer handling', 'Last-mile delivery', 'Cash handling'],
        certifications: ['Driving License', 'Vehicle Safety'],
        suggestedSalary: 25000,
        cityHints: ['Hyderabad', 'Bengaluru', 'Mumbai'],
        languageHints: ['Hindi', 'English', 'Telugu'],
    },
    {
        title: 'Warehouse Associate',
        aliases: ['Inventory Associate', 'Warehouse Executive', 'Dispatch Associate'],
        category: 'Logistics',
        skills: ['Inventory handling', 'Packing and dispatch', 'Scanner usage', 'Warehouse safety'],
        certifications: ['Forklift Certification', 'Warehouse Safety'],
        suggestedSalary: 22000,
        cityHints: ['Hyderabad', 'Bengaluru', 'Chennai'],
        languageHints: ['Hindi', 'English'],
    },
    {
        title: 'Customer Support Executive',
        aliases: ['Customer Support', 'Support Associate', 'Call Center Executive'],
        category: 'Support',
        skills: ['Ticket handling', 'Communication', 'Issue resolution', 'CRM updates'],
        certifications: ['Customer Service Training'],
        suggestedSalary: 28000,
        cityHints: ['Hyderabad', 'Bengaluru', 'Pune'],
        languageHints: ['English', 'Hindi'],
    },
    {
        title: 'Sales Executive',
        aliases: ['Field Sales', 'Inside Sales', 'Business Development Executive'],
        category: 'Sales',
        skills: ['Lead generation', 'Negotiation', 'Client follow-up', 'CRM tracking'],
        certifications: ['Sales Fundamentals'],
        suggestedSalary: 30000,
        cityHints: ['Mumbai', 'Delhi NCR', 'Bengaluru'],
        languageHints: ['English', 'Hindi'],
    },
    {
        title: 'Data Entry Operator',
        aliases: ['Back Office Executive', 'MIS Executive'],
        category: 'Operations',
        skills: ['Data accuracy', 'Excel', 'Documentation', 'Typing speed'],
        certifications: ['Advanced Excel'],
        suggestedSalary: 23000,
        cityHints: ['Hyderabad', 'Chennai', 'Delhi NCR'],
        languageHints: ['English', 'Hindi'],
    },
    {
        title: 'Plumber',
        aliases: ['Pipe Fitter', 'Plumbing Technician'],
        category: 'Skilled Trades',
        skills: ['Pipe fitting', 'Leak troubleshooting', 'Maintenance checks', 'Tool handling'],
        certifications: ['Trade License', 'Safety Compliance'],
        suggestedSalary: 32000,
        cityHints: ['Bengaluru', 'Chennai', 'Mumbai'],
        languageHints: ['Hindi', 'Tamil', 'Kannada'],
    },
    {
        title: 'Electrician',
        aliases: ['Electrical Technician', 'Wireman'],
        category: 'Skilled Trades',
        skills: ['Electrical troubleshooting', 'Wiring standards', 'Circuit diagnosis', 'Preventive maintenance'],
        certifications: ['Electrical License', 'Industrial Safety'],
        suggestedSalary: 35000,
        cityHints: ['Hyderabad', 'Mumbai', 'Pune'],
        languageHints: ['Hindi', 'English'],
    },
    {
        title: 'Carpenter',
        aliases: ['Woodwork Technician', 'Furniture Carpenter'],
        category: 'Skilled Trades',
        skills: ['Wood cutting', 'Measurement accuracy', 'Installation', 'Finishing'],
        certifications: ['Trade Certification'],
        suggestedSalary: 30000,
        cityHints: ['Delhi NCR', 'Mumbai', 'Bengaluru'],
        languageHints: ['Hindi', 'English'],
    },
    {
        title: 'Welder',
        aliases: ['Fabrication Welder', 'Arc Welder'],
        category: 'Skilled Trades',
        skills: ['Welding basics', 'Fabrication support', 'Safety protocols', 'Blueprint reading'],
        certifications: ['Welding Certification', 'Safety Compliance'],
        suggestedSalary: 34000,
        cityHints: ['Chennai', 'Pune', 'Hyderabad'],
        languageHints: ['Hindi', 'English'],
    },
    {
        title: 'HVAC Technician',
        aliases: ['AC Technician', 'Refrigeration Technician'],
        category: 'Skilled Trades',
        skills: ['HVAC maintenance', 'Fault diagnosis', 'Installation support', 'Preventive service'],
        certifications: ['HVAC Certification', 'Electrical Safety'],
        suggestedSalary: 36000,
        cityHints: ['Bengaluru', 'Hyderabad', 'Chennai'],
        languageHints: ['English', 'Hindi'],
    },
    {
        title: 'Machine Operator',
        aliases: ['Production Operator', 'Plant Operator'],
        category: 'Manufacturing',
        skills: ['Machine handling', 'Quality checks', 'SOP compliance', 'Downtime reporting'],
        certifications: ['Machine Safety', 'Quality Control'],
        suggestedSalary: 28000,
        cityHints: ['Pune', 'Chennai', 'Bengaluru'],
        languageHints: ['Hindi', 'English'],
    },
    {
        title: 'Retail Associate',
        aliases: ['Store Associate', 'Sales Associate'],
        category: 'Retail',
        skills: ['Customer interaction', 'POS billing', 'Stock handling', 'Upselling'],
        certifications: ['Retail Operations'],
        suggestedSalary: 24000,
        cityHints: ['Mumbai', 'Delhi NCR', 'Bengaluru'],
        languageHints: ['Hindi', 'English'],
    },
    {
        title: 'Cashier',
        aliases: ['POS Cashier', 'Billing Executive'],
        category: 'Retail',
        skills: ['POS billing', 'Cash reconciliation', 'Customer support', 'Invoice handling'],
        certifications: ['POS Handling', 'Basic Accounting'],
        suggestedSalary: 22000,
        cityHints: ['Mumbai', 'Hyderabad', 'Chennai'],
        languageHints: ['Hindi', 'English'],
    },
    {
        title: 'Security Guard',
        aliases: ['Security Officer', 'Facility Security'],
        category: 'Security',
        skills: ['Access control', 'Incident reporting', 'Patrolling', 'Emergency response'],
        certifications: ['Security Training', 'First Aid'],
        suggestedSalary: 23000,
        cityHints: ['Hyderabad', 'Delhi NCR', 'Bengaluru'],
        languageHints: ['Hindi', 'English'],
    },
    {
        title: 'Nursing Assistant',
        aliases: ['Patient Care Assistant', 'Healthcare Assistant'],
        category: 'Healthcare',
        skills: ['Patient support', 'Vitals assistance', 'Hygiene protocol', 'Record handling'],
        certifications: ['BLS', 'Patient Care Certification'],
        suggestedSalary: 30000,
        cityHints: ['Chennai', 'Bengaluru', 'Hyderabad'],
        languageHints: ['English', 'Hindi', 'Tamil'],
    },
    {
        title: 'Frontend Developer',
        aliases: ['React Developer', 'UI Developer'],
        category: 'Technology',
        skills: ['JavaScript', 'React', 'Responsive UI', 'API integration'],
        certifications: ['Frontend Development', 'JavaScript'],
        suggestedSalary: 50000,
        cityHints: ['Bengaluru', 'Hyderabad', 'Remote'],
        languageHints: ['English'],
    },
    {
        title: 'Backend Developer',
        aliases: ['Node.js Developer', 'Server-side Engineer'],
        category: 'Technology',
        skills: ['Node.js', 'REST APIs', 'Database design', 'Debugging'],
        certifications: ['Backend Development', 'Cloud Fundamentals'],
        suggestedSalary: 55000,
        cityHints: ['Bengaluru', 'Hyderabad', 'Remote'],
        languageHints: ['English'],
    },
    {
        title: 'Account Assistant',
        aliases: ['Accounts Executive', 'Finance Assistant'],
        category: 'Finance',
        skills: ['Bookkeeping', 'Invoice processing', 'Excel', 'Reconciliation'],
        certifications: ['Tally', 'Basic Accounting'],
        suggestedSalary: 30000,
        cityHints: ['Mumbai', 'Pune', 'Delhi NCR'],
        languageHints: ['English', 'Hindi'],
    },
    {
        title: 'Office Administrator',
        aliases: ['Admin Executive', 'Office Coordinator'],
        category: 'Operations',
        skills: ['Documentation', 'Vendor coordination', 'Calendar management', 'Office operations'],
        certifications: ['Office Administration'],
        suggestedSalary: 28000,
        cityHints: ['Hyderabad', 'Pune', 'Chennai'],
        languageHints: ['English', 'Hindi'],
    },
];

const normalizeToken = (value = '') => String(value || '').trim().toLowerCase();

const findRoleEntry = (roleTitle = '') => {
    const normalizedRole = normalizeToken(roleTitle);
    if (!normalizedRole) return null;

    const exact = ROLE_CATALOG.find((entry) => (
        normalizeToken(entry.title) === normalizedRole
        || (Array.isArray(entry.aliases) && entry.aliases.some((alias) => normalizeToken(alias) === normalizedRole))
    ));
    if (exact) return exact;

    const partial = ROLE_CATALOG.find((entry) => (
        normalizeToken(entry.title).includes(normalizedRole)
        || normalizedRole.includes(normalizeToken(entry.title))
        || (Array.isArray(entry.aliases) && entry.aliases.some((alias) => (
            normalizeToken(alias).includes(normalizedRole) || normalizedRole.includes(normalizeToken(alias))
        )))
    ));
    return partial || null;
};

export const searchRoleTitles = (query = '', limit = 10) => {
    const normalizedQuery = normalizeToken(query);
    const searchable = ROLE_CATALOG.map((entry) => ({
        title: entry.title,
        category: entry.category,
        aliases: Array.isArray(entry.aliases) ? entry.aliases : [],
    }));

    if (!normalizedQuery) {
        return searchable.slice(0, limit).map(({ title, category }) => ({ title, category }));
    }

    const startsWith = searchable.filter((entry) => (
        normalizeToken(entry.title).startsWith(normalizedQuery)
        || entry.aliases.some((alias) => normalizeToken(alias).startsWith(normalizedQuery))
    ));
    const contains = searchable.filter((entry) => (
        (normalizeToken(entry.title).includes(normalizedQuery)
            || entry.aliases.some((alias) => normalizeToken(alias).includes(normalizedQuery)))
        && !startsWith.some((item) => item.title === entry.title)
    ));

    return [...startsWith, ...contains]
        .slice(0, limit)
        .map(({ title, category }) => ({ title, category }));
};

export const inferRoleCategory = (roleTitle = '') => {
    const entry = findRoleEntry(roleTitle);
    return String(entry?.category || '').trim();
};

export const getRoleDefaults = (roleTitle = '') => {
    const entry = findRoleEntry(roleTitle);
    if (entry) {
        return {
            skills: Array.isArray(entry.skills) ? entry.skills : [],
            certifications: Array.isArray(entry.certifications) ? entry.certifications : [],
            suggestedSalary: Number.isFinite(Number(entry.suggestedSalary)) ? Number(entry.suggestedSalary) : 0,
            cityHints: Array.isArray(entry.cityHints) && entry.cityHints.length ? entry.cityHints : COMMON_CITY_HINTS,
            languageHints: Array.isArray(entry.languageHints) && entry.languageHints.length ? entry.languageHints : COMMON_LANGUAGE_HINTS,
            category: entry.category,
        };
    }

    return {
        skills: ['Communication', 'Teamwork', 'Problem solving'],
        certifications: ['Basic Safety Training'],
        suggestedSalary: 25000,
        cityHints: COMMON_CITY_HINTS,
        languageHints: COMMON_LANGUAGE_HINTS,
        category: '',
    };
};

export const getAllRoleTitles = () => ROLE_CATALOG.map((entry) => entry.title);
export const getCommonCityHints = () => [...COMMON_CITY_HINTS];
export const getCommonLanguageHints = () => [...COMMON_LANGUAGE_HINTS];
