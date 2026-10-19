/* ============================================================
   FraudGuard AI — Indian Digital Payment Data & Knowledge Base
   Tailored for Gen-Z users in India transacting via UPI, QR Codes,
   Cards, Net Banking, and Mobile Wallets.
============================================================ */

export const INDIAN_MERCHANTS = [
  { name: 'Swiggy', category: 'Food & Dining', icon: 'Utensils' },
  { name: 'Zomato', category: 'Food & Dining', icon: 'Utensils' },
  { name: 'Zepto', category: 'Grocery', icon: 'ShoppingBag' },
  { name: 'Blinkit', category: 'Grocery', icon: 'ShoppingBag' },
  { name: 'Amazon India', category: 'Online Shopping', icon: 'ShoppingBag' },
  { name: 'Flipkart', category: 'Online Shopping', icon: 'ShoppingBag' },
  { name: 'Myntra', category: 'Online Shopping', icon: 'ShoppingBag' },
  { name: 'Nykaa', category: 'Online Shopping', icon: 'ShoppingBag' },
  { name: 'BookMyShow', category: 'Entertainment', icon: 'Film' },
  { name: 'Spotify India', category: 'Entertainment', icon: 'Music' },
  { name: 'Netflix India', category: 'Entertainment', icon: 'Tv' },
  { name: 'Uber India', category: 'Travel', icon: 'Car' },
  { name: 'Ola Cabs', category: 'Travel', icon: 'Car' },
  { name: 'IRCTC', category: 'Travel', icon: 'Train' },
  { name: 'Delhi Metro SmartCard', category: 'Travel', icon: 'Train' },
  { name: 'Reliance Digital', category: 'Electronics', icon: 'Laptop' },
  { name: 'Croma', category: 'Electronics', icon: 'Laptop' },
  { name: 'Starbucks Coffee - Bandra', category: 'Food & Dining', icon: 'Coffee' },
  { name: 'Third Wave Coffee - Indiranagar', category: 'Food & Dining', icon: 'Coffee' },
  { name: 'Local QR Merchant (Pooja General Store)', category: 'Grocery', icon: 'QrCode' },
  { name: 'Telegram Job Portal (Suspicious)', category: 'Other', icon: 'AlertTriangle' },
  { name: 'Unknown P2P UPI Collect', category: 'Other', icon: 'AlertCircle' },
  { name: 'FastBill Electricity Desk (Fake)', category: 'Utilities', icon: 'Zap' },
];

export const INDIAN_CITIES = [
  'Bengaluru, Karnataka',
  'Mumbai, Maharashtra',
  'Delhi NCR (Gurugram)',
  'Pune, Maharashtra',
  'Hyderabad, Telangana',
  'Chennai, Tamil Nadu',
  'Jaipur, Rajasthan',
  'Kolkata, West Bengal',
  'Chandigarh',
  'Ahmedabad, Gujarat'
];

export const PAYMENT_METHODS = [
  { id: 'UPI_PHONEPE', label: 'UPI - PhonePe' },
  { id: 'UPI_GPAY', label: 'UPI - Google Pay' },
  { id: 'UPI_PAYTM', label: 'UPI - Paytm' },
  { id: 'UPI_CRED', label: 'UPI - CRED' },
  { id: 'QR_CODE', label: 'QR Code Scan & Pay' },
  { id: 'DEBIT_CARD', label: 'Debit Card (RuPay/Visa)' },
  { id: 'CREDIT_CARD', label: 'Credit Card' },
  { id: 'NET_BANKING', label: 'Net Banking' }
];

export const DEVICE_TYPES = [
  'iPhone 15 Pro (iOS 17)',
  'OnePlus 12 (OxygenOS / Android 14)',
  'Samsung Galaxy S24 (Android 14)',
  'MacBook Air M2 (Chrome 128)',
  'Windows 11 PC (Edge 128)',
  'Redmi Note 13 (Android 13)'
];

/* Demo National Fraud Statistics (clearly labeled as static demo/national reference data) */
export const INDIA_FRAUD_STATS = [
  {
    id: 'upi',
    title: 'UPI Payment Scams',
    count: '6.9 Lakh+',
    metric: 'Complaints reported annually',
    change: '+42% YoY surge',
    description: 'Impersonation via collect requests, fake cashback vouchers, and remote-screen sharing apps.',
    source: 'National Cyber Crime Reporting Portal (Demo Reference)',
    icon: 'Smartphone'
  },
  {
    id: 'digital',
    title: 'Digital Payment Fraud',
    count: '₹1,457 Cr',
    metric: 'Estimated annual user exposure',
    change: 'Gen Z most targeted age group',
    description: 'Deceptive links disguised as refund portals or instant lottery rewards.',
    source: 'RBI Financial Safety Review (Demo Data)',
    icon: 'CreditCard'
  },
  {
    id: 'qr',
    title: 'QR Code Scams',
    count: '1.8 Lakh+',
    metric: 'Tricked into scanning to receive funds',
    change: 'Over 65% first-time buyers',
    description: 'Fraudsters send QR codes falsely claiming: "Scan this code to receive your Olx/Marketplace payment".',
    source: 'Cyber Police Advisory Desk',
    icon: 'QrCode'
  },
  {
    id: 'phishing',
    title: 'Phishing & Smishing Links',
    count: '3.2 Lakh+',
    metric: 'Deceptive SMS/WhatsApp alerts',
    change: '+78% malicious APK links',
    description: '"Your electricity will be disconnected tonight" or "PAN card verification pending" links.',
    source: 'CERT-In Security Advisory (Demo Sample)',
    icon: 'MailWarning'
  },
  {
    id: 'fake_care',
    title: 'Fake Customer Care Calls',
    count: '95,000+',
    metric: 'Spoofed search engine numbers',
    change: 'Affects delivery & wallet users',
    description: 'Fraudulent numbers indexed on search engines prompting users to install AnyDesk/RustDesk.',
    source: 'I4C Cyber Crime Wing',
    icon: 'PhoneCall'
  },
  {
    id: 'shopping',
    title: 'Online Shopping Scams',
    count: '2.1 Lakh+',
    metric: 'Fake Instagram/Social storefronts',
    change: 'Deep discount fake luxury items',
    description: 'Prepaid orders placed on illegitimate social stores where goods are never dispatched.',
    source: 'Consumer Protection Bureau (Sample)',
    icon: 'ShoppingBag'
  }
];

/* Seed transactions for customer Anshika Sharma */
export const INITIAL_CUSTOMER_TRANSACTIONS = [
  {
    id: 'TXN-90241',
    date: '2026-09-11',
    time: '23:45',
    merchant: 'Unknown P2P UPI Collect',
    category: 'Other',
    amount: 14500,
    paymentMethod: 'UPI - PhonePe',
    location: 'Jaipur, Rajasthan',
    device: 'Unknown Android Device',
    riskLevel: 'CRITICAL',
    riskScore: 94,
    fraudProbability: 92,
    status: 'fraudulent',
    flaggedReasons: [
      'Late-night transaction time (11:45 PM) deviating from profile baseline',
      'Unsolicited UPI collect request from an unverified VPA',
      'Amount is 11.7x higher than user median daily transaction',
      'Unfamiliar geographic IP location detected'
    ],
    recommendation: 'Block VPA immediately and decline collect request. Do NOT enter UPI PIN.'
  },
  {
    id: 'TXN-90240',
    date: '2026-09-11',
    time: '20:12',
    merchant: 'Reliance Digital',
    category: 'Electronics',
    amount: 8500,
    paymentMethod: 'Credit Card',
    location: 'Bengaluru, Karnataka',
    device: 'iPhone 15 Pro (iOS 17)',
    riskLevel: 'HIGH',
    riskScore: 82,
    fraudProbability: 79,
    status: 'suspicious',
    flaggedReasons: [
      'Amount significantly above normal weekly electronic spending',
      'First transaction at this merchant terminal within 90 days',
      'Transaction velocity anomaly: 3 successive payment requests within 4 minutes'
    ],
    recommendation: 'Review purchase authenticity. Confirm if you authorized this in-store payment.'
  },
  {
    id: 'TXN-90239',
    date: '2026-09-11',
    time: '19:30',
    merchant: 'Swiggy',
    category: 'Food & Dining',
    amount: 480,
    paymentMethod: 'UPI - Google Pay',
    location: 'Bengaluru, Karnataka',
    device: 'iPhone 15 Pro (iOS 17)',
    riskLevel: 'LOW',
    riskScore: 12,
    fraudProbability: 4,
    status: 'legitimate',
    flaggedReasons: ['Routine trusted merchant matching historical profile'],
    recommendation: 'Safe transaction. No action needed.'
  },
  {
    id: 'TXN-90238',
    date: '2026-09-11',
    time: '17:15',
    merchant: 'Blinkit',
    category: 'Grocery',
    amount: 620,
    paymentMethod: 'UPI - Paytm',
    location: 'Bengaluru, Karnataka',
    device: 'iPhone 15 Pro (iOS 17)',
    riskLevel: 'LOW',
    riskScore: 8,
    fraudProbability: 2,
    status: 'legitimate',
    flaggedReasons: ['Verified merchant and typical quick-commerce transaction size'],
    recommendation: 'Safe transaction.'
  },
  {
    id: 'TXN-90237',
    date: '2026-09-10',
    time: '14:20',
    merchant: 'Telegram Job Portal (Suspicious)',
    category: 'Other',
    amount: 2500,
    paymentMethod: 'UPI - Google Pay',
    location: 'Unknown IP (VPN)',
    device: 'Windows 11 PC (Edge 128)',
    riskLevel: 'HIGH',
    riskScore: 86,
    fraudProbability: 84,
    status: 'suspicious',
    flaggedReasons: [
      'Known pattern of "Part-time rating/job deposit" scam receiver VPA',
      'Payment made to newly generated individual UPI QR code',
      'VPN connection utilized during transaction authorization'
    ],
    recommendation: 'Do NOT transfer further funds. Legitimate employers never request deposit fees.'
  },
  {
    id: 'TXN-90236',
    date: '2026-09-10',
    time: '11:05',
    merchant: 'Third Wave Coffee - Indiranagar',
    category: 'Food & Dining',
    amount: 340,
    paymentMethod: 'QR Code Scan & Pay',
    location: 'Bengaluru, Karnataka',
    device: 'iPhone 15 Pro (iOS 17)',
    riskLevel: 'LOW',
    riskScore: 6,
    fraudProbability: 1,
    status: 'legitimate',
    flaggedReasons: ['Physical merchant verified UPI QR scan within normal routine'],
    recommendation: 'Safe transaction.'
  },
  {
    id: 'TXN-90235',
    date: '2026-09-09',
    time: '21:10',
    merchant: 'Zepto',
    category: 'Grocery',
    amount: 395,
    paymentMethod: 'UPI - CRED',
    location: 'Bengaluru, Karnataka',
    device: 'iPhone 15 Pro (iOS 17)',
    riskLevel: 'LOW',
    riskScore: 9,
    fraudProbability: 3,
    status: 'legitimate',
    flaggedReasons: ['Consistent delivery merchant and normal spending range'],
    recommendation: 'Safe transaction.'
  },
  {
    id: 'TXN-90234',
    date: '2026-09-09',
    time: '15:45',
    merchant: 'Myntra',
    category: 'Online Shopping',
    amount: 2890,
    paymentMethod: 'Credit Card',
    location: 'Bengaluru, Karnataka',
    device: 'MacBook Air M2 (Chrome 128)',
    riskLevel: 'LOW',
    riskScore: 18,
    fraudProbability: 6,
    status: 'legitimate',
    flaggedReasons: ['Recognized e-commerce partner, 3D Secure step passed'],
    recommendation: 'Safe transaction.'
  },
  {
    id: 'TXN-90233',
    date: '2026-09-08',
    time: '02:30',
    merchant: 'FastBill Electricity Desk (Fake)',
    category: 'Utilities',
    amount: 4999,
    paymentMethod: 'Net Banking',
    location: 'Kolkata, West Bengal',
    device: 'Unknown Android Device',
    riskLevel: 'CRITICAL',
    riskScore: 96,
    fraudProbability: 95,
    status: 'fraudulent',
    flaggedReasons: [
      'Target domain mimics state electricity board payment portal',
      'Transaction triggered at 2:30 AM via fake SMS urgent notice link',
      'Recipient bank account flagged in 14 state cyber fraud complaints'
    ],
    recommendation: 'Immediate alert: Fraudulent phishing site. Disavow and file portal ticket.'
  },
  {
    id: 'TXN-90232',
    date: '2026-09-08',
    time: '18:50',
    merchant: 'BookMyShow',
    category: 'Entertainment',
    amount: 950,
    paymentMethod: 'UPI - PhonePe',
    location: 'Bengaluru, Karnataka',
    device: 'iPhone 15 Pro (iOS 17)',
    riskLevel: 'LOW',
    riskScore: 11,
    fraudProbability: 3,
    status: 'legitimate',
    flaggedReasons: ['Usual weekend entertainment booking'],
    recommendation: 'Safe transaction.'
  },
  {
    id: 'TXN-90231',
    date: '2026-09-07',
    time: '13:10',
    merchant: 'Zomato',
    category: 'Food & Dining',
    amount: 520,
    paymentMethod: 'UPI - Google Pay',
    location: 'Bengaluru, Karnataka',
    device: 'iPhone 15 Pro (iOS 17)',
    riskLevel: 'LOW',
    riskScore: 7,
    fraudProbability: 2,
    status: 'legitimate',
    flaggedReasons: ['Regular frequency lunch order'],
    recommendation: 'Safe transaction.'
  },
  {
    id: 'TXN-90230',
    date: '2026-09-06',
    time: '16:00',
    merchant: 'Delhi Metro SmartCard',
    category: 'Travel',
    amount: 500,
    paymentMethod: 'UPI - Paytm',
    location: 'Delhi NCR (Gurugram)',
    device: 'iPhone 15 Pro (iOS 17)',
    riskLevel: 'LOW',
    riskScore: 5,
    fraudProbability: 1,
    status: 'legitimate',
    flaggedReasons: ['Verified transit system NFC / UPI top-up'],
    recommendation: 'Safe transaction.'
  }
];

export const DEMO_TRANSACTIONS = INITIAL_CUSTOMER_TRANSACTIONS;

/* Initial Fraud Alerts for Customer Anshika */
export const INITIAL_FRAUD_ALERTS = [
  {
    id: 'ALT-101',
    transactionId: 'TXN-90241',
    riskLevel: 'CRITICAL',
    riskScore: 94,
    fraudProbability: 92,
    amount: 14500,
    merchant: 'Unknown P2P UPI Collect',
    category: 'Other',
    timestamp: 'Yesterday, 11:45 PM',
    status: 'new', // new, reviewed, resolved, dismissed
    whyFlagged: [
      'Unsolicited collect request received from unknown VPA',
      'Transaction triggered at 11:45 PM (outside your 8 AM - 10 PM routine)',
      'Requested amount ₹14,500 is 11.7x your average transaction amount',
      'Originating IP in Jaipur, Rajasthan differs from your current location'
    ],
    recommendedAction: 'Decline the collect request on PhonePe. Never enter your UPI PIN to receive money.'
  },
  {
    id: 'ALT-102',
    transactionId: 'TXN-90240',
    riskLevel: 'HIGH',
    riskScore: 82,
    fraudProbability: 79,
    amount: 8500,
    merchant: 'Reliance Digital',
    category: 'Electronics',
    timestamp: 'Yesterday, 8:12 PM',
    status: 'new',
    whyFlagged: [
      'Unusual purchase spike: Amount is ₹7,260 higher than your 30-day average',
      'New merchant terminal not seen in past 6 months',
      'Multiple rapid authentication attempts recorded within 4 minutes'
    ],
    recommendedAction: 'Confirm if you made this in-store electronic purchase. If not, freeze your card immediately.'
  },
  {
    id: 'ALT-103',
    transactionId: 'TXN-90237',
    riskLevel: 'HIGH',
    riskScore: 86,
    fraudProbability: 84,
    amount: 2500,
    merchant: 'Telegram Job Portal (Suspicious)',
    category: 'Other',
    timestamp: 'Sep 10, 2:20 PM',
    status: 'investigating',
    whyFlagged: [
      'Recipient UPI handle reported by 28 users for fake task/rating scams',
      'Authorization made via proxy/VPN node',
      'Pattern matches advance fee employment scam'
    ],
    recommendedAction: 'Do not transfer additional funds. Block the contact on Telegram and report the VPA.'
  },
  {
    id: 'ALT-104',
    transactionId: 'TXN-90233',
    riskLevel: 'CRITICAL',
    riskScore: 96,
    fraudProbability: 95,
    amount: 4999,
    merchant: 'FastBill Electricity Desk (Fake)',
    category: 'Utilities',
    timestamp: 'Sep 08, 2:30 AM',
    status: 'resolved',
    whyFlagged: [
      'Destination gateway belongs to spoofed phishing portal',
      'Triggered following an urgent SMS warning of electricity power disconnection',
      'Recipient account under freezing order by cyber cell'
    ],
    recommendedAction: 'Account reported to cyber cell and gateway blocked.'
  }
];

/* Safety Center Topics (Comprehensive Educational Guides) */
export const SAFETY_TOPICS = [
  {
    id: 'upi-scams',
    title: 'UPI Scams & Collect Requests',
    tagline: 'The #1 Scam targeting Indian Gen-Z users',
    category: 'UPI & Mobile',
    icon: 'Smartphone',
    whatIsIt: 'Scammers initiate a "Collect Request" on apps like Google Pay, PhonePe, or Paytm while claiming they are sending you money, prize money, or a refund.',
    howItWorks: 'You receive a notification: "XYZ is requesting ₹5,000". The scammer tells you on call: "Just tap accept and enter your UPI PIN to receive the cashback into your bank account". In reality, entering your PIN deducts money from your account.',
    warningSigns: [
      'Someone claiming you need to enter your UPI PIN to RECEIVE funds',
      'Unsolicited collect requests on PhonePe, Paytm, or Google Pay',
      'Callers offering unexpected lottery rewards, contest wins, or OLX buyer advances',
      'Urgency created by claims like "Offer expires in 2 minutes"'
    ],
    whatToDo: [
      'Decline all unexpected collect requests immediately',
      'Remember the golden rule: UPI PIN is ONLY entered to SEND money, NEVER to receive',
      'Block the sender UPI VPA handle on your payment app',
      'Report the incident to the 1930 National Cyber Helpline if money was deducted'
    ],
    whatNotToDo: [
      'NEVER enter your UPI PIN when expecting money from someone',
      'Do not click on SMS links claiming to unlock cashback rewards',
      'Do not share your UPI ID publicly on social media threads'
    ]
  },
  {
    id: 'qr-code-scams',
    title: 'QR Code Payment Scams',
    tagline: 'Scan to pay, NEVER scan to receive',
    category: 'QR & In-Store',
    icon: 'QrCode',
    whatIsIt: 'Fraudsters send a QR code via WhatsApp or email, falsely stating that scanning it will instantly credit money to your bank account.',
    howItWorks: 'Often seen on OLX or Quikr when selling second-hand items. The buyer claims to be an army officer or corporate manager who cannot pay in cash and sends a QR code image to scan.',
    warningSigns: [
      'Buyer insists on paying exclusively via a QR image sent on WhatsApp',
      'The QR screen asks for your bank UPI PIN or shows an amount to debit',
      'Buyer overpays "by mistake" and asks you to scan another QR to return the excess'
    ],
    whatToDo: [
      'Educate yourself: QR codes are fundamentally payment recipient identifiers',
      'To receive money, simply share your PhonePe/GPay mobile number or UPI ID — no scan needed',
      'Verify physical QR stickers at roadside shops before scanning to prevent sticker tampering'
    ],
    whatNotToDo: [
      'Never scan any QR code sent to you on WhatsApp or Telegram',
      'Do not enter any 4-digit or 6-digit PIN on a QR payment screen'
    ]
  },
  {
    id: 'phishing',
    title: 'Phishing & Malicious APKs',
    tagline: 'Fake update links, PAN verification & Electricity SMS',
    category: 'Web & Messaging',
    icon: 'MailWarning',
    whatIsIt: 'Deceptive SMS, emails, or WhatsApp messages with links that lead to cloned banking web pages or trigger downloads of spyware APK files.',
    howItWorks: 'You receive: "Dear customer, your electricity connection will be disconnected at 9:30 PM due to unpaid bill. Call 98XXXXXX or download bill update app here". The link installs a keylogger or redirects to a cloned net banking login.',
    warningSigns: [
      'Sender uses personal 10-digit mobile numbers instead of official sender IDs (e.g. +91 98210... instead of VM-HDFCBK)',
      'High pressure messages threatening account deactivation, utility disconnection, or SIM block',
      'Web links ending with suspicious extensions like .xyz, .top, .ru, or raw IP addresses'
    ],
    whatToDo: [
      'Always open your official electricity board, bank, or carrier app directly from the Play Store/App Store',
      'Check URL domain carefully: e.g., onlinesbi.sbi vs onlinesbi-support.com',
      'Delete suspicious SMS immediately without clicking links'
    ],
    whatNotToDo: [
      'Never download APK files sent via WhatsApp, Telegram, or unknown browser links',
      'Do not enter Net Banking passwords, OTPs, or debit card CVVs on external web links'
    ]
  },
  {
    id: 'fake-customer-care',
    title: 'Fake Customer Care Numbers',
    tagline: 'Search engine ad traps for Swiggy, Zomato, Banks & Couriers',
    category: 'Call & Social',
    icon: 'PhoneCall',
    whatIsIt: 'Cybercriminals create fake Google Maps listings, paid search ads, and fake Twitter handles with their own phone numbers labeled as customer support for Swiggy, Zomato, Delhivery, or SBI.',
    howItWorks: 'When you search "Swiggy refund customer care number", Google displays a fraudulent helpline number. When you call, the "agent" promises an instant refund and instructs you to download AnyDesk or click a verification link.',
    warningSigns: [
      'Customer support executive asks you to download AnyDesk, TeamViewer, or RustDesk',
      'Support asks you to pay a nominal ₹1 or ₹5 "registration/test fee" via UPI',
      'The caller speaks aggressively or tells you not to disconnect the call'
    ],
    whatToDo: [
      'Always use in-app chat support inside Swiggy, Zomato, Amazon, or your bank app',
      'Check official website footer for genuine contact email and 1800 toll-free numbers'
    ],
    whatNotToDo: [
      'Never google "customer care number" and call phone numbers directly from search snippets',
      'Never grant screen sharing or accessibility permissions to anyone claiming to be support'
    ]
  },
  {
    id: 'fake-payment-screenshots',
    title: 'Fake Payment Screenshots & Spoof Apps',
    tagline: 'Prank & spoof APKs displaying fraudulent "Payment Successful" screens',
    category: 'UPI & Mobile',
    icon: 'FileCheck',
    whatIsIt: 'Scammers use apps like "Paytm Spoof" or "PhonePe Prank" to generate realistic animated payment success screens showing your name, mobile number, and the exact purchase amount.',
    howItWorks: 'A buyer at a shop or marketplace shows the screen: "Look, ₹4,500 transferred successfully via UPI". They claim the SMS is delayed due to server load and rush away with your product.',
    warningSigns: [
      'Buyer is in a hurry and insists you trust their mobile screen animation',
      'You have NOT received the payment push notification or SMS on your own phone',
      'Your bank account balance has not increased in your own UPI app'
    ],
    whatToDo: [
      'Always verify payment inside YOUR own UPI app or wait for the voice box (Soundbox) announcement',
      'Check account passbook / transaction history directly on your device before handing over items'
    ],
    whatNotToDo: [
      'Never hand over goods solely based on the buyer showing their phone screen'
    ]
  },
  {
    id: 'remote-access-scams',
    title: 'Remote Access & Screen Sharing Scams',
    tagline: 'AnyDesk, RustDesk, QuickSupport & TeamViewer hijacking',
    category: 'Device Security',
    icon: 'Monitor',
    whatIsIt: 'Tricking users into downloading legitimate remote desktop software onto their phone or laptop, enabling the scammer to view your screen in real time and steal OTPs.',
    howItWorks: 'Fraudster poses as KYC verification officer: "Download QuickSupport from Play Store to complete your 5G SIM activation". They ask for the 9-digit session code, watch you open your bank app, and record your PIN or OTP.',
    warningSigns: [
      'Caller instructs you to install AnyDesk, TeamViewer, RustDesk, or QuickSupport',
      'Caller asks for a 9-digit or 10-digit code displayed on your screen',
      'Device notification indicates "Your screen is being cast / shared"'
    ],
    whatToDo: [
      'Immediately uninstall any remote desktop application installed on unknown advice',
      'Turn on Airplane mode immediately if you notice remote control of your phone'
    ],
    whatNotToDo: [
      'Never share remote session IDs or access codes with anyone over the phone'
    ]
  },
  {
    id: 'fake-jobs',
    title: 'Part-Time Work & Telegram Job Scams',
    tagline: 'Like YouTube videos, rate Google Maps places, earn ₹3,000/day',
    category: 'Jobs & Investment',
    icon: 'Briefcase',
    whatIsIt: 'Unsolicited WhatsApp/Telegram offers promising high daily earnings for trivial tasks like rating hotels, liking videos, or reviewing products.',
    howItWorks: 'They pay ₹150 for the first 3 tasks to gain trust. Next, they invite you to a "VIP task group" where you must deposit ₹2,000 to unlock a ₹5,000 task. When you deposit more, your funds are frozen and they demand a "tax fee".',
    warningSigns: [
      'Messages from foreign numbers (+62, +234, +84, etc.) offering work-from-home gigs',
      'Tasks consisting only of taking screenshots of liked YouTube videos',
      'Requirement to deposit "prepaid margin funds" into unknown personal UPI accounts'
    ],
    whatToDo: [
      'Block and report unsolicited work offer numbers on WhatsApp and Telegram',
      'Recognize that legitimate corporate hiring happens through official job portals and corporate emails'
    ],
    whatNotToDo: [
      'Never transfer money to an employer or platform to "unlock earnings" or "activate tasks"'
    ]
  },
  {
    id: 'investment-scams',
    title: 'High-Yield Investment & Crypto Schemes',
    tagline: '"Guaranteed 200% returns in 7 days" trading groups',
    category: 'Jobs & Investment',
    icon: 'TrendingUp',
    whatIsIt: 'Fake stock trading platforms, bogus IPO allotments, or crypto arbitrage schemes promoted through Telegram and Instagram influencers.',
    howItWorks: 'Victims are added to WhatsApp groups where dozens of bots post fake profits. The user is guided to deposit funds onto an unregistered trading web app that displays artificially inflated balances that cannot be withdrawn.',
    warningSigns: [
      'Promises of "zero risk" and "guaranteed daily profits"',
      'Payments collected into changing individual saving accounts rather than SEBI registered brokers',
      'Demands for "withdrawal processing fees" or "capital gains advance taxes"'
    ],
    whatToDo: [
      'Only trade through SEBI-registered brokers (Zerodha, Groww, AngelOne, Upstox, etc.)',
      'Verify broker registration number on SEBI.gov.in directory'
    ],
    whatNotToDo: [
      'Never transfer funds to private individual bank accounts for stock tips or crypto pools'
    ]
  },
  {
    id: 'digital-impersonation',
    title: 'Digital Impersonation & Fake Police "Digital Arrest"',
    tagline: 'Fake CBI, Mumbai Police, FedEx, and Customs video calls',
    category: 'Call & Social',
    icon: 'ShieldAlert',
    whatIsIt: 'Scammers pose as Police, CBI, ED, or Customs officers over Skype or WhatsApp video call in artificial police station sets, claiming your Aadhaar is linked to money laundering or illegal parcels.',
    howItWorks: 'They intimidate you by stating you are under "digital arrest" and must keep your video camera on. They demand you transfer all your savings into a "Reserve Bank verification safety account" to prove innocence.',
    warningSigns: [
      'Uniformed officials demanding video calls on WhatsApp or Skype',
      'Claims of "digital arrest" or warrants issued via WhatsApp PDF',
      'Demand to move money into a "government verification account"'
    ],
    whatToDo: [
      'Remember: In Indian law, there is NO concept of "Digital Arrest" — police never interrogate via WhatsApp video call',
      'Disconnect the video call immediately and report to cybercrime.gov.in or call 1930'
    ],
    whatNotToDo: [
      'Never transfer money to any account for "verification" or "bail"'
    ]
  }
];

/* Admin / Analyst Demo Model Performance Metrics (clearly labeled Demo Model Metrics) */
export const DEMO_MODEL_METRICS = {
  modelName: 'FraudGuard LightGBM-Ensemble v3.4',
  lastTrained: '2026-09-08 04:30 IST',
  datasetSize: '1,420,000 Transactions',
  evaluationMode: 'Out-of-Time Validation (Indian UPI & Card Batches)',
  kpis: {
    precision: 0.948,
    recall: 0.923,
    f1Score: 0.935,
    rocAuc: 0.984,
    prAuc: 0.952
  },
  confusionMatrix: {
    trueNegative: 49120,
    falsePositive: 268,
    falseNegative: 388,
    truePositive: 4624
  },
  featureImportance: [
    { feature: 'Amount Deviation from User Baseline', importance: 0.28 },
    { feature: 'Unusual Transaction Time (00:00 - 05:00)', importance: 0.19 },
    { feature: 'Recipient VPA Fraud History / Blacklist Score', importance: 0.16 },
    { feature: 'Transaction Velocity (3+ Txns in 5 mins)', importance: 0.13 },
    { feature: 'New Unverified Merchant / Peer QR Scan', importance: 0.10 },
    { feature: 'Geo-IP Distance Anomaly (>250km from user base)', importance: 0.08 },
    { feature: 'Device Fingerprint Mismatch / VPN Detected', importance: 0.06 }
  ]
};

/* User Accounts for Admin Portal */
export const DEMO_USERS_LIST = [
  {
    id: 'USR-8801',
    name: 'Anshika Sharma',
    email: 'anshika.sharma@example.com',
    role: 'customer',
    riskScore: 24,
    riskLevel: 'LOW',
    safetyScore: 87,
    totalTransactions: 124,
    fraudCases: 2,
    totalVolume: 84250,
    lastActive: '12 mins ago',
    status: 'active'
  },
  {
    id: 'USR-8802',
    name: 'Kabir Mehta',
    email: 'kabir.mehta@example.com',
    role: 'customer',
    riskScore: 68,
    riskLevel: 'HIGH',
    safetyScore: 48,
    totalTransactions: 92,
    fraudCases: 5,
    totalVolume: 142000,
    lastActive: '1 hour ago',
    status: 'flagged'
  },
  {
    id: 'USR-8803',
    name: 'Aanya Reddy',
    email: 'aanya.reddy@example.com',
    role: 'customer',
    riskScore: 14,
    riskLevel: 'LOW',
    safetyScore: 92,
    totalTransactions: 240,
    fraudCases: 0,
    totalVolume: 67300,
    lastActive: '3 hours ago',
    status: 'active'
  },
  {
    id: 'USR-8804',
    name: 'Rohan Deshmukh',
    email: 'rohan.deshmukh@example.com',
    role: 'customer',
    riskScore: 84,
    riskLevel: 'CRITICAL',
    safetyScore: 32,
    totalTransactions: 45,
    fraudCases: 7,
    totalVolume: 215400,
    lastActive: 'Just now',
    status: 'suspended'
  },
  {
    id: 'USR-8805',
    name: 'Isha Nair',
    email: 'isha.nair@example.com',
    role: 'customer',
    riskScore: 32,
    riskLevel: 'MEDIUM',
    safetyScore: 78,
    totalTransactions: 110,
    fraudCases: 1,
    totalVolume: 51200,
    lastActive: 'Yesterday',
    status: 'active'
  }
];
