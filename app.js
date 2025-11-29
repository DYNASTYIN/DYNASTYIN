// ========================================
// DynastyIN - COMPLETE WORKING JAVASCRIPT
// ========================================

// Configuration
const CONFIG = {
    ADMIN_PASSPHRASE: 'DynastyIN2000',
    DB_NAME: 'DynastyInDB',
    DB_VERSION: 4,
    STORE_NAME: 'paintings',
    BACKGROUND_STORE: 'backgrounds',
    BLOG_STORE: 'blogPosts',
    CONTENT_STORE: 'websiteContent',
    THUMBNAIL_MAX_WIDTH: 400,
    THUMBNAIL_MAX_HEIGHT: 300,
    DISPLAY_MAX_WIDTH: 1920,
    DISPLAY_MAX_HEIGHT: 1080,
    BACKGROUND_MAX_WIDTH: 1920,
    BACKGROUND_MAX_HEIGHT: 1080,
    IMAGE_QUALITY: 0.85,
    LQIP_SIZE: 20
};

// Global State
const state = {
    db: null,
    isAdmin: false,
    currentPaintings: [],
    currentBackgrounds: [],
    currentBlogPosts: [],
    websiteContent: {
        about: '',
        contact: '',
        disclaimer: ''
    },
    selectedPaintingIndex: -1,
    editingPaintingId: null,
    editingBlogPostId: null,
    currentImageData: null,
    currentBackgroundImageData: null
};

// Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎨 DynastyIN starting...');
    
    try {
        // Initialize database
        state.db = await openDatabase();
        console.log('✅ Database connected');
        
        // Check if we need to load demo data
        const paintings = await getAllPaintings();
        const backgrounds = await getAllBackgrounds();
        const blogPosts = await getAllBlogPosts();
        const content = await getAllWebsiteContent();
        
        if (paintings.length === 0) {
            console.log('Loading demo paintings...');
            await loadDemoPaintings();
        }
        
        if (backgrounds.length === 0) {
            console.log('Loading demo backgrounds...');
            await loadDemoBackgrounds();
        }

        if (blogPosts.length === 0) {
            console.log('Loading demo blog posts...');
            await loadDemoBlogPosts();
        }

        if (content.length === 0) {
            console.log('Loading demo website content...');
            await loadDemoWebsiteContent();
        }
        
        // Load backgrounds and initialize slideshow
        await loadBackgrounds();
        
        // Initialize custom cursor
        initCustomCursor();
        
        // Initialize scroll effects
        initScrollEffects();
        
        // Load theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.className = `theme-${savedTheme}`;
        document.getElementById('themeSelect').value = savedTheme;
        
        // Check admin status
        state.isAdmin = sessionStorage.getItem('adminUnlocked') === 'true';
        updateAdminUI();
        
        // Load and display paintings
        await loadPaintings();
        
        // Load and display blog posts
        await loadBlogPosts();
        
        // Load website content
        await loadWebsiteContent();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup secret admin access - FIXED
        setupSecretAdminAccess();
        
        console.log('✅ DynastyIN ready!');
        
        // Hide loading indicator
        setTimeout(() => {
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.style.opacity = '0';
            setTimeout(() => {
                loadingIndicator.classList.add('hidden');
            }, 600);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
    }
});

// === Background Slideshow ===
async function initBackgroundSlideshow() {
    const slideshow = document.getElementById('backgroundSlideshow');
    if (!slideshow) return;
    
    // Clear existing slides
    slideshow.innerHTML = '';
    
    if (state.currentBackgrounds.length === 0) {
        // Add default slides if no backgrounds
        const defaultSlides = [
            'https://images.unsplash.com/photo-1579546929662-711aa81148cf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            'https://images.unsplash.com/photo-1543857778-c4a1a569e388?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            'https://images.unsplash.com/photo-1513364776144-60967b0f800f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80'
        ];
        
        defaultSlides.forEach((url, index) => {
            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;
            slide.style.backgroundImage = `url('${url}')`;
            slideshow.appendChild(slide);
        });
    } else {
        // Add slides from backgrounds
        state.currentBackgrounds.forEach((background, index) => {
            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;
            slide.style.backgroundImage = `url(${URL.createObjectURL(background.imageBlob)})`;
            slideshow.appendChild(slide);
        });
    }
    
    // Start slideshow animation
    const slides = slideshow.querySelectorAll('.slide');
    let currentSlide = 0;
    
    function nextSlide() {
        // Remove active class from current slide
        slides[currentSlide].classList.remove('active');
        
        // Move to next slide
        currentSlide = (currentSlide + 1) % slides.length;
        
        // Add active class to new slide
        slides[currentSlide].classList.add('active');
    }
    
    // Change slide every 3 seconds
    setInterval(nextSlide, 3000);
}

// === Database Functions ===
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create paintings store
            if (!db.objectStoreNames.contains(CONFIG.STORE_NAME)) {
                const objectStore = db.createObjectStore(CONFIG.STORE_NAME, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                objectStore.createIndex('title', 'title', { unique: false });
                objectStore.createIndex('createdAt', 'createdAt', { unique: false });
            }
            
            // Create backgrounds store
            if (!db.objectStoreNames.contains(CONFIG.BACKGROUND_STORE)) {
                const backgroundStore = db.createObjectStore(CONFIG.BACKGROUND_STORE, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                backgroundStore.createIndex('name', 'name', { unique: false });
                backgroundStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Create blog posts store
            if (!db.objectStoreNames.contains(CONFIG.BLOG_STORE)) {
                const blogStore = db.createObjectStore(CONFIG.BLOG_STORE, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                blogStore.createIndex('title', 'title', { unique: false });
                blogStore.createIndex('createdAt', 'createdAt', { unique: false });
                blogStore.createIndex('status', 'status', { unique: false });
            }

            // Create website content store
            if (!db.objectStoreNames.contains(CONFIG.CONTENT_STORE)) {
                const contentStore = db.createObjectStore(CONFIG.CONTENT_STORE, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                contentStore.createIndex('type', 'type', { unique: true });
                contentStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
    });
}

// Painting functions
async function addPainting(painting) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.STORE_NAME);
        const request = objectStore.add(painting);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function updatePainting(id, painting) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.STORE_NAME);
        const request = objectStore.put({ ...painting, id });
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deletePainting(id) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.STORE_NAME);
        const request = objectStore.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getAllPaintings() {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(CONFIG.STORE_NAME);
        const request = objectStore.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Background functions
async function addBackground(background) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.BACKGROUND_STORE], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.BACKGROUND_STORE);
        const request = objectStore.add(background);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteBackground(id) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.BACKGROUND_STORE], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.BACKGROUND_STORE);
        const request = objectStore.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getAllBackgrounds() {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.BACKGROUND_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIG.BACKGROUND_STORE);
        const request = objectStore.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Blog functions
async function addBlogPost(blogPost) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.BLOG_STORE], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.BLOG_STORE);
        const request = objectStore.add(blogPost);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function updateBlogPost(id, blogPost) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.BLOG_STORE], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.BLOG_STORE);
        const request = objectStore.put({ ...blogPost, id });
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteBlogPost(id) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.BLOG_STORE], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.BLOG_STORE);
        const request = objectStore.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getAllBlogPosts() {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.BLOG_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIG.BLOG_STORE);
        const request = objectStore.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Website content functions
async function updateWebsiteContent(type, content) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.CONTENT_STORE], 'readwrite');
        const objectStore = transaction.objectStore(CONFIG.CONTENT_STORE);
        
        // First try to get existing content
        const getRequest = objectStore.index('type').get(type);
        
        getRequest.onsuccess = () => {
            const existing = getRequest.result;
            const contentData = {
                type: type,
                content: content,
                updatedAt: new Date()
            };
            
            let request;
            if (existing) {
                contentData.id = existing.id;
                request = objectStore.put(contentData);
            } else {
                request = objectStore.add(contentData);
            }
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        };
        
        getRequest.onerror = () => reject(getRequest.error);
    });
}

async function getWebsiteContent(type) {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.CONTENT_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIG.CONTENT_STORE);
        const request = objectStore.index('type').get(type);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllWebsiteContent() {
    return new Promise((resolve, reject) => {
        const transaction = state.db.transaction([CONFIG.CONTENT_STORE], 'readonly');
        const objectStore = transaction.objectStore(CONFIG.CONTENT_STORE);
        const request = objectStore.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// === Demo Data ===
async function loadDemoPaintings() {
    const demos = [
        {
            title: 'Sunset Dreams',
            year: 2024,
            medium: 'Oil on Canvas',
            size: '24" × 36"',
            description: 'A vibrant exploration of color and light at dusk',
            tags: ['landscape', 'oil', 'contemporary'],
            category: 'Landscapes',
            visibility: 'public',
            color: '#FF6B6B'
        },
        {
            title: 'Urban Solitude',
            year: 2023,
            medium: 'Acrylic on Canvas',
            size: '30" × 40"',
            description: 'Capturing the quiet moments in city life',
            tags: ['urban', 'acrylic', 'modern'],
            category: 'Urban',
            visibility: 'public',
            color: '#4ECDC4'
        },
        {
            title: 'Abstract Emotion',
            year: 2024,
            medium: 'Mixed Media',
            size: '36" × 48"',
            description: 'An emotional journey through color and texture',
            tags: ['abstract', 'contemporary', 'mixed-media'],
            category: 'Abstract',
            visibility: 'public',
            color: '#FFE66D'
        }
    ];
    
    for (const demo of demos) {
        const imageBlob = await generateDemoImage(demo.title, demo.color);
        const thumbnail = await processImage(imageBlob, CONFIG.THUMBNAIL_MAX_WIDTH, CONFIG.THUMBNAIL_MAX_HEIGHT);
        const display = await processImage(imageBlob, CONFIG.DISPLAY_MAX_WIDTH, CONFIG.DISPLAY_MAX_HEIGHT);
        const lqip = await generateLQIP(imageBlob);
        
        await addPainting({
            ...demo,
            thumbnailBlob: thumbnail,
            displayBlob: display,
            lqip: lqip,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}

async function loadDemoBackgrounds() {
    const demoBackgrounds = [
        {
            name: 'Abstract Gradient',
            url: 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
        },
        {
            name: 'Color Burst',
            url: 'https://images.unsplash.com/photo-1543857778-c4a1a569e388?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
        },
        {
            name: 'Geometric Pattern',
            url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80'
        }
    ];
    
    for (const background of demoBackgrounds) {
        try {
            const response = await fetch(background.url);
            const blob = await response.blob();
            const processedImage = await processImage(blob, CONFIG.BACKGROUND_MAX_WIDTH, CONFIG.BACKGROUND_MAX_HEIGHT);
            
            await addBackground({
                name: background.name,
                imageBlob: processedImage,
                createdAt: new Date()
            });
        } catch (error) {
            console.error('Error loading demo background:', error);
        }
    }
}

async function loadDemoBlogPosts() {
    const demoPosts = [
        {
            title: 'Welcome to DynastyIN',
            content: 'Welcome to our new art portfolio! We are excited to share our journey in contemporary art with you. This space will feature our latest works, creative process, and artistic philosophy.',
            excerpt: 'An introduction to our art portfolio and creative journey.',
            status: 'published',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            title: 'The Creative Process',
            content: 'Creating art is a journey of discovery. Each piece begins with an idea, a feeling, or a moment of inspiration. From there, we explore different techniques, colors, and compositions to bring that vision to life.',
            excerpt: 'Exploring the journey from inspiration to finished artwork.',
            status: 'published',
            createdAt: new Date(Date.now() - 86400000), // 1 day ago
            updatedAt: new Date(Date.now() - 86400000)
        }
    ];
    
    for (const post of demoPosts) {
        await addBlogPost(post);
    }
}

async function loadDemoWebsiteContent() {
    const defaultAbout = `
        <p>DynastyIN is a contemporary art portfolio dedicated to exploring the boundaries of visual expression. Founded in 2020, our studio brings together traditional techniques with modern digital innovation.</p>
        <p>Our artists draw inspiration from the natural world, urban landscapes, and the complex tapestry of human emotion. Each piece tells a story, captures a moment, or expresses a feeling that transcends words.</p>
        <p>We believe that art should be accessible to everyone while maintaining the highest standards of quality and craftsmanship. Our works are created with premium materials and attention to detail that ensures they will be treasured for generations.</p>
    `;
    
    const defaultContact = `
        <p><strong>Studio Location:</strong><br>
        123 Art District<br>
        Creative City, CC 10001</p>
        
        <p><strong>Email:</strong> art@dynastyin.com</p>
        <p><strong>Phone:</strong> +1 (555) 123-ART1</p>
        
        <p><strong>Studio Hours:</strong><br>
        Monday - Friday: 10AM - 6PM<br>
        Saturday: 11AM - 4PM<br>
        Sunday: Closed</p>
        
        <p>We welcome visitors by appointment. Please contact us to schedule a studio visit or discuss commission opportunities.</p>
    `;
    
    const defaultDisclaimer = `
        <p><strong>Copyright Notice</strong></p>
        <p>All artworks, images, and content displayed on this website are the intellectual property of DynastyIN and the respective artists. Unauthorized reproduction, distribution, or commercial use of any content is strictly prohibited.</p>
        
        <p><strong>Privacy</strong></p>
        <p>We respect your privacy. Any personal information collected through this website is used solely for the purpose of communication and will never be shared with third parties without your explicit consent.</p>
        
        <p><strong>Commission Work</strong></p>
        <p>Commissioned works are subject to individual agreements. Prices, timelines, and specifications will be discussed and agreed upon before work begins. Deposits may be required for commission projects.</p>
        
        <p><strong>Sales & Shipping</strong></p>
        <p>All sales are final. Shipping costs and insurance are the responsibility of the purchaser. We take great care in packaging and shipping artworks to ensure they arrive in perfect condition.</p>
        
        <p>For any questions regarding these policies, please contact us directly.</p>
    `;
    
    await updateWebsiteContent('about', defaultAbout);
    await updateWebsiteContent('contact', defaultContact);
    await updateWebsiteContent('disclaimer', defaultDisclaimer);
}

async function generateDemoImage(title, color) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColor(color, -30));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add title
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, canvas.width / 2, canvas.height / 2);
        
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', CONFIG.IMAGE_QUALITY);
    });
}

function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// === Custom Cursor ===
function initCustomCursor() {
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    
    if (!cursor || !cursorFollower) {
        console.log('Cursor elements not found');
        return;
    }
    
    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
        
        // Magnetic effect for interactive elements
        const magneticElements = document.querySelectorAll('.magnetic-btn, .gallery-item, .btn, .admin-btn, .blog-post');
        let isHovering = false;
        
        magneticElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                isHovering = true;
            }
        });

        cursor.classList.toggle('hover', isHovering);
        cursorFollower.classList.toggle('hover', isHovering);
    });

    // Smooth follower animation
    function animateCursor() {
        followerX += (mouseX - followerX) * 0.1;
        followerY += (mouseY - followerY) * 0.1;
        
        cursorFollower.style.left = followerX + 'px';
        cursorFollower.style.top = followerY + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
}

// === Scroll Effects ===
function initScrollEffects() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    let lastScrollY = window.scrollY;
    
    function updateHeader() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScrollY = currentScrollY;
    }
    
    window.addEventListener('scroll', updateHeader);
    
    // Scroll animations for elements
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    // Observe gallery items and section titles
    document.querySelectorAll('.gallery-item, .section-title, .blog-post, .content-section').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
        observer.observe(el);
    });
}

// === Event Listeners ===
function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Admin
    const adminToggle = document.getElementById('adminToggle');
    if (adminToggle) {
        adminToggle.addEventListener('click', showAdminPrompt);
    }
    
    const unlockBtn = document.getElementById('unlockBtn');
    if (unlockBtn) {
        unlockBtn.addEventListener('click', unlockAdmin);
    }
    
    const cancelAdminBtn = document.getElementById('cancelAdminBtn');
    if (cancelAdminBtn) {
        cancelAdminBtn.addEventListener('click', hideAdminPrompt);
    }
    
    const passphraseInput = document.getElementById('passphraseInput');
    if (passphraseInput) {
        passphraseInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') unlockAdmin();
        });
    }
    
    // Admin actions
    const addPaintingBtn = document.getElementById('addPaintingBtn');
    if (addPaintingBtn) {
        addPaintingBtn.addEventListener('click', showAddPaintingModal);
    }
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
    }
    
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', importData);
    }
    
    // Background management
    const addBackgroundBtn = document.getElementById('addBackgroundBtn');
    if (addBackgroundBtn) {
        addBackgroundBtn.addEventListener('click', showAddBackgroundModal);
    }

    // Theme management
    const applyThemeBtn = document.getElementById('applyThemeBtn');
    if (applyThemeBtn) {
        applyThemeBtn.addEventListener('click', applySelectedTheme);
    }
    
    // Content management
    const manageAboutBtn = document.getElementById('manageAboutBtn');
    if (manageAboutBtn) {
        manageAboutBtn.addEventListener('click', showAboutContentModal);
    }
    
    const manageContactBtn = document.getElementById('manageContactBtn');
    if (manageContactBtn) {
        manageContactBtn.addEventListener('click', showContactContentModal);
    }
    
    const manageDisclaimerBtn = document.getElementById('manageDisclaimerBtn');
    if (manageDisclaimerBtn) {
        manageDisclaimerBtn.addEventListener('click', showDisclaimerContentModal);
    }
    
    const manageBlogBtn = document.getElementById('manageBlogBtn');
    if (manageBlogBtn) {
        manageBlogBtn.addEventListener('click', showBlogPostsModal);
    }
    
    // Blog management
    const addBlogPostBtn = document.getElementById('addBlogPostBtn');
    if (addBlogPostBtn) {
        addBlogPostBtn.addEventListener('click', showAddBlogPostModal);
    }
    
    // Painting form
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageSelect);
    }
    
    setupDragAndDrop();
    
    const paintingForm = document.getElementById('paintingForm');
    if (paintingForm) {
        paintingForm.addEventListener('submit', savePainting);
    }
    
    const closePaintingModal = document.getElementById('closePaintingModal');
    if (closePaintingModal) {
        closePaintingModal.addEventListener('click', hidePaintingModal);
    }
    
    const cancelPaintingBtn = document.getElementById('cancelPaintingBtn');
    if (cancelPaintingBtn) {
        cancelPaintingBtn.addEventListener('click', hidePaintingModal);
    }
    
    const removeImageBtn = document.getElementById('removeImageBtn');
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            removeSelectedImage();
        });
    }
    
    // Background form
    const backgroundImageInput = document.getElementById('backgroundImageInput');
    if (backgroundImageInput) {
        backgroundImageInput.addEventListener('change', handleBackgroundImageSelect);
    }
    
    setupBackgroundDragAndDrop();
    
    const backgroundForm = document.getElementById('backgroundForm');
    if (backgroundForm) {
        backgroundForm.addEventListener('submit', saveBackground);
    }
    
    const closeBackgroundModal = document.getElementById('closeBackgroundModal');
    if (closeBackgroundModal) {
        closeBackgroundModal.addEventListener('click', hideBackgroundModal);
    }
    
    const cancelBackgroundBtn = document.getElementById('cancelBackgroundBtn');
    if (cancelBackgroundBtn) {
        cancelBackgroundBtn.addEventListener('click', hideBackgroundModal);
    }
    
    const removeBackgroundImageBtn = document.getElementById('removeBackgroundImageBtn');
    if (removeBackgroundImageBtn) {
        removeBackgroundImageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            removeSelectedBackgroundImage();
        });
    }

    // Blog form
    const blogPostForm = document.getElementById('blogPostForm');
    if (blogPostForm) {
        blogPostForm.addEventListener('submit', saveBlogPost);
    }
    
    const closeBlogModal = document.getElementById('closeBlogModal');
    if (closeBlogModal) {
        closeBlogModal.addEventListener('click', hideBlogPostModal);
    }
    
    const cancelBlogBtn = document.getElementById('cancelBlogBtn');
    if (cancelBlogBtn) {
        cancelBlogBtn.addEventListener('click', hideBlogPostModal);
    }

    // Content forms
    const aboutContentForm = document.getElementById('aboutContentForm');
    if (aboutContentForm) {
        aboutContentForm.addEventListener('submit', saveAboutContent);
    }
    
    const closeAboutContentModal = document.getElementById('closeAboutContentModal');
    if (closeAboutContentModal) {
        closeAboutContentModal.addEventListener('click', hideAboutContentModal);
    }
    
    const cancelAboutContentBtn = document.getElementById('cancelAboutContentBtn');
    if (cancelAboutContentBtn) {
        cancelAboutContentBtn.addEventListener('click', hideAboutContentModal);
    }

    const contactContentForm = document.getElementById('contactContentForm');
    if (contactContentForm) {
        contactContentForm.addEventListener('submit', saveContactContent);
    }
    
    const closeContactContentModal = document.getElementById('closeContactContentModal');
    if (closeContactContentModal) {
        closeContactContentModal.addEventListener('click', hideContactContentModal);
    }
    
    const cancelContactContentBtn = document.getElementById('cancelContactContentBtn');
    if (cancelContactContentBtn) {
        cancelContactContentBtn.addEventListener('click', hideContactContentModal);
    }

    const disclaimerContentForm = document.getElementById('disclaimerContentForm');
    if (disclaimerContentForm) {
        disclaimerContentForm.addEventListener('submit', saveDisclaimerContent);
    }
    
    const closeDisclaimerContentModal = document.getElementById('closeDisclaimerContentModal');
    if (closeDisclaimerContentModal) {
        closeDisclaimerContentModal.addEventListener('click', hideDisclaimerContentModal);
    }
    
    const cancelDisclaimerContentBtn = document.getElementById('cancelDisclaimerContentBtn');
    if (cancelDisclaimerContentBtn) {
        cancelDisclaimerContentBtn.addEventListener('click', hideDisclaimerContentModal);
    }

    // Blog posts management
    const closeBlogPostsModal = document.getElementById('closeBlogPostsModal');
    if (closeBlogPostsModal) {
        closeBlogPostsModal.addEventListener('click', hideBlogPostsModal);
    }
    
    // Lightbox
    const closeLightbox = document.getElementById('closeLightbox');
    if (closeLightbox) {
        closeLightbox.addEventListener('click', closeLightboxFunc);
    }
    
    const prevPainting = document.getElementById('prevPainting');
    if (prevPainting) {
        prevPainting.addEventListener('click', showPreviousPainting);
    }
    
    const nextPainting = document.getElementById('nextPainting');
    if (nextPainting) {
        nextPainting.addEventListener('click', showNextPainting);
    }
    
    const editPaintingBtn = document.getElementById('editPaintingBtn');
    if (editPaintingBtn) {
        editPaintingBtn.addEventListener('click', editCurrentPainting);
    }
    
    const deletePaintingBtn = document.getElementById('deletePaintingBtn');
    if (deletePaintingBtn) {
        deletePaintingBtn.addEventListener('click', deleteCurrentPainting);
    }

    // Disclaimer link
    const disclaimerLink = document.getElementById('disclaimerLink');
    if (disclaimerLink) {
        disclaimerLink.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('disclaimerModal');
        });
    }

    const closeDisclaimerModal = document.getElementById('closeDisclaimerModal');
    if (closeDisclaimerModal) {
        closeDisclaimerModal.addEventListener('click', () => hideModal('disclaimerModal'));
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyPress);
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                const modal = overlay.closest('.modal');
                if (modal) hideModal(modal.id);
            }
        });
    });
}

// === Image Handling ===
function setupDragAndDrop() {
    const dropzone = document.getElementById('imageDropzone');
    if (!dropzone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('dragover');
        }, false);
    });
    
    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    }, false);
}

function setupBackgroundDragAndDrop() {
    const dropzone = document.getElementById('backgroundDropzone');
    if (!dropzone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('dragover');
        }, false);
    });
    
    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleBackgroundImageFile(files[0]);
        }
    }, false);
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

function handleBackgroundImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleBackgroundImageFile(file);
    }
}

async function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }
    
    try {
        showLoading();
        
        const thumbnail = await processImage(file, CONFIG.THUMBNAIL_MAX_WIDTH, CONFIG.THUMBNAIL_MAX_HEIGHT);
        const display = await processImage(file, CONFIG.DISPLAY_MAX_WIDTH, CONFIG.DISPLAY_MAX_HEIGHT);
        const lqip = await generateLQIP(file);
        
        state.currentImageData = {
            thumbnailBlob: thumbnail,
            displayBlob: display,
            lqip: lqip
        };
        
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('dropzoneContent').classList.add('hidden');
            document.getElementById('imagePreview').classList.remove('hidden');
        };
        reader.readAsDataURL(display);
        
        hideLoading();
    } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try another file.');
        hideLoading();
    }
}

async function handleBackgroundImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }
    
    try {
        showLoading();
        
        const processedImage = await processImage(file, CONFIG.BACKGROUND_MAX_WIDTH, CONFIG.BACKGROUND_MAX_HEIGHT);
        
        state.currentBackgroundImageData = {
            imageBlob: processedImage
        };
        
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('backgroundPreviewImg').src = e.target.result;
            document.getElementById('backgroundDropzoneContent').classList.add('hidden');
            document.getElementById('backgroundImagePreview').classList.remove('hidden');
        };
        reader.readAsDataURL(processedImage);
        
        hideLoading();
    } catch (error) {
        console.error('Error processing background image:', error);
        alert('Failed to process image. Please try another file.');
        hideLoading();
    }
}

function removeSelectedImage() {
    state.currentImageData = null;
    document.getElementById('dropzoneContent').classList.remove('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
}

function removeSelectedBackgroundImage() {
    state.currentBackgroundImageData = null;
    document.getElementById('backgroundDropzoneContent').classList.remove('hidden');
    document.getElementById('backgroundImagePreview').classList.add('hidden');
}

// === Image Processing ===
async function processImage(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', CONFIG.IMAGE_QUALITY);
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function generateLQIP(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = CONFIG.LQIP_SIZE;
                canvas.height = CONFIG.LQIP_SIZE;
                
                const ctx = canvas.getContext('2d');
                ctx.filter = 'blur(4px)';
                ctx.drawImage(img, 0, 0, CONFIG.LQIP_SIZE, CONFIG.LQIP_SIZE);
                
                resolve(canvas.toDataURL('image/jpeg', 0.3));
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// === Theme Management ===
function toggleTheme() {
    const currentTheme = document.body.className.replace('theme-', '');
    const themes = ['dark', 'light', 'serene', 'earth', 'vibrant', 'monochrome', 'sunset'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];
    
    document.body.className = `theme-${newTheme}`;
    document.getElementById('themeSelect').value = newTheme;
    localStorage.setItem('theme', newTheme);
}

function applySelectedTheme() {
    const themeSelect = document.getElementById('themeSelect');
    const newTheme = themeSelect.value;
    
    document.body.className = `theme-${newTheme}`;
    localStorage.setItem('theme', newTheme);
}

// === Admin ===
function showAdminPrompt() {
    if (state.isAdmin) {
        state.isAdmin = false;
        sessionStorage.removeItem('adminUnlocked');
        updateAdminUI();
    } else {
        showModal('adminPrompt');
        document.getElementById('passphraseInput').focus();
    }
}

function unlockAdmin() {
    const passphrase = document.getElementById('passphraseInput').value;
    
    if (passphrase === CONFIG.ADMIN_PASSPHRASE) {
        state.isAdmin = true;
        sessionStorage.setItem('adminUnlocked', 'true');
        updateAdminUI();
        hideAdminPrompt();
        document.getElementById('passphraseInput').value = '';
    } else {
        alert('Incorrect passphrase. Please try again.');
        document.getElementById('passphraseInput').value = '';
        document.getElementById('passphraseInput').focus();
    }
}

function hideAdminPrompt() {
    hideModal('adminPrompt');
    document.getElementById('passphraseInput').value = '';
}

function updateAdminUI() {
    const adminPanel = document.getElementById('adminPanel');
    const adminToggle = document.getElementById('adminToggle');
    const lightboxActions = document.getElementById('lightboxAdminActions');
    
    if (state.isAdmin) {
        adminPanel.classList.remove('hidden');
        adminToggle.classList.add('admin-active');
        if (lightboxActions) lightboxActions.classList.remove('hidden');
        // Load backgrounds list when admin panel is shown
        loadBackgroundsList();
    } else {
        adminPanel.classList.add('hidden');
        adminToggle.classList.remove('admin-active');
        if (lightboxActions) lightboxActions.classList.add('hidden');
    }
}

// === Secret Admin Access - FIXED VERSION ===
function setupSecretAdminAccess() {
    let pressedKeys = new Set();
    
    document.addEventListener('keydown', (e) => {
        // Add the pressed key to our set
        pressedKeys.add(e.key.toLowerCase());
        
        // Check for Ctrl+Shift+Alt+Z combination
        const hasCtrl = pressedKeys.has('control');
        const hasShift = pressedKeys.has('shift');
        const hasAlt = pressedKeys.has('alt');
        const hasZ = pressedKeys.has('z');
        
        if (hasCtrl && hasShift && hasAlt && hasZ) {
            e.preventDefault();
            const adminToggle = document.getElementById('adminToggle');
            if (adminToggle && adminToggle.style.display === 'none') {
                adminToggle.style.display = 'flex';
                console.log('🔑 Admin access revealed - Press Ctrl+Shift+Alt+Z');
                
                // Show a subtle notification
                showTemporaryNotification('Admin access revealed!', 'success');
            }
            // Clear the keys after successful combination
            pressedKeys.clear();
        }
        
        // Limit the size to prevent memory issues
        if (pressedKeys.size > 10) {
            pressedKeys.clear();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        pressedKeys.delete(e.key.toLowerCase());
    });
    
    // Also clear keys if window loses focus
    window.addEventListener('blur', () => {
        pressedKeys.clear();
    });
}

// === Temporary Notification Function ===
function showTemporaryNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// === Load Paintings ===
async function loadPaintings() {
    try {
        showLoading();
        
        let paintings = await getAllPaintings();
        
        if (!state.isAdmin) {
            paintings = paintings.filter(p => p.visibility === 'public');
        }
        
        paintings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        state.currentPaintings = paintings;
        renderGallery();
        
        hideLoading();
    } catch (error) {
        console.error('Error loading paintings:', error);
        hideLoading();
    }
}

function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!grid || !emptyState) return;
    
    if (state.currentPaintings.length === 0) {
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    grid.innerHTML = state.currentPaintings.map((painting, index) => {
        const imageUrl = URL.createObjectURL(painting.displayBlob);
        
        return `
            <div class="gallery-item" data-index="${index}">
                <img src="${imageUrl}" 
                     alt="${painting.title}" 
                     class="gallery-item-image"
                     loading="lazy">
                <div class="gallery-item-overlay">
                    <div class="gallery-item-info">
                        <h3>${painting.title}</h3>
                        <p>${painting.year || 'N/A'} • ${painting.medium || 'N/A'}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    grid.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            openLightbox(index);
        });
    });
}

// === Load Backgrounds ===
async function loadBackgrounds() {
    try {
        const backgrounds = await getAllBackgrounds();
        backgrounds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        state.currentBackgrounds = backgrounds;
        await initBackgroundSlideshow();
    } catch (error) {
        console.error('Error loading backgrounds:', error);
    }
}

async function loadBackgroundsList() {
    const backgroundsList = document.getElementById('backgroundsList');
    if (!backgroundsList) return;
    
    try {
        const backgrounds = await getAllBackgrounds();
        backgrounds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        if (backgrounds.length === 0) {
            backgroundsList.innerHTML = '<p class="text-muted">No background images yet. Add your first one!</p>';
            return;
        }
        
        backgroundsList.innerHTML = backgrounds.map(background => {
            const imageUrl = URL.createObjectURL(background.imageBlob);
            
            return `
                <div class="background-item" data-id="${background.id}">
                    <img src="${imageUrl}" alt="${background.name}" class="background-item-image" loading="lazy">
                    <div class="background-item-info">
                        <p><strong>${background.name}</strong></p>
                        <p class="text-muted">${new Date(background.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="background-item-actions">
                        <button class="btn btn-small btn-danger delete-background" data-id="${background.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners for delete buttons
        backgroundsList.querySelectorAll('.delete-background').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.dataset.id);
                if (confirm('Are you sure you want to delete this background image?')) {
                    try {
                        await deleteBackground(id);
                        await loadBackgroundsList();
                        await loadBackgrounds(); // Reload backgrounds and update slideshow
                    } catch (error) {
                        console.error('Error deleting background:', error);
                        alert('Failed to delete background image. Please try again.');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading backgrounds list:', error);
        backgroundsList.innerHTML = '<p class="text-muted">Error loading background images.</p>';
    }
}

// === Blog Management ===
async function loadBlogPosts() {
    try {
        let blogPosts = await getAllBlogPosts();
        
        if (!state.isAdmin) {
            blogPosts = blogPosts.filter(post => post.status === 'published');
        }
        
        blogPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        state.currentBlogPosts = blogPosts;
        renderBlogPosts();
    } catch (error) {
        console.error('Error loading blog posts:', error);
    }
}

function renderBlogPosts() {
    const blogPostsContainer = document.getElementById('blogPosts');
    const emptyBlogState = document.getElementById('emptyBlogState');
    
    if (!blogPostsContainer || !emptyBlogState) return;
    
    if (state.currentBlogPosts.length === 0) {
        blogPostsContainer.classList.add('hidden');
        emptyBlogState.classList.remove('hidden');
        return;
    }
    
    blogPostsContainer.classList.remove('hidden');
    emptyBlogState.classList.add('hidden');
    
    blogPostsContainer.innerHTML = state.currentBlogPosts.map((post, index) => {
        const excerpt = post.excerpt || post.content.substring(0, 150) + '...';
        const date = new Date(post.createdAt).toLocaleDateString();
        
        return `
            <div class="blog-post" data-index="${index}">
                <div class="blog-post-content">
                    <h3 class="blog-post-title">${post.title}</h3>
                    <p class="blog-post-date">${date}</p>
                    <p class="blog-post-excerpt">${excerpt}</p>
                    <button class="btn btn-primary read-more-btn">Read More</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for read more buttons
    blogPostsContainer.querySelectorAll('.read-more-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            showBlogPostModal(index);
        });
    });
}

async function loadBlogPostsList() {
    const blogPostsList = document.getElementById('blogPostsList');
    if (!blogPostsList) return;
    
    try {
        const blogPosts = await getAllBlogPosts();
        blogPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        if (blogPosts.length === 0) {
            blogPostsList.innerHTML = '<p class="text-muted">No blog posts yet. Add your first one!</p>';
            return;
        }
        
        blogPostsList.innerHTML = blogPosts.map(post => {
            const date = new Date(post.createdAt).toLocaleDateString();
            const statusBadge = post.status === 'published' ? 
                '<span class="status-badge published">Published</span>' : 
                '<span class="status-badge draft">Draft</span>';
            
            return `
                <div class="blog-post-item" data-id="${post.id}">
                    <div class="blog-post-item-info">
                        <h4>${post.title}</h4>
                        <p class="text-muted">${date} ${statusBadge}</p>
                    </div>
                    <div class="blog-post-item-actions">
                        <button class="btn btn-small btn-primary edit-blog-post" data-id="${post.id}">Edit</button>
                        <button class="btn btn-small btn-danger delete-blog-post" data-id="${post.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners for edit and delete buttons
        blogPostsList.querySelectorAll('.edit-blog-post').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.dataset.id);
                showEditBlogPostModal(id);
            });
        });
        
        blogPostsList.querySelectorAll('.delete-blog-post').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = parseInt(e.target.dataset.id);
                if (confirm('Are you sure you want to delete this blog post?')) {
                    try {
                        await deleteBlogPost(id);
                        await loadBlogPostsList();
                        await loadBlogPosts();
                    } catch (error) {
                        console.error('Error deleting blog post:', error);
                        alert('Failed to delete blog post. Please try again.');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading blog posts list:', error);
        blogPostsList.innerHTML = '<p class="text-muted">Error loading blog posts.</p>';
    }
}

// === Website Content Management ===
async function loadWebsiteContent() {
    try {
        const aboutContent = await getWebsiteContent('about');
        const contactContent = await getWebsiteContent('contact');
        const disclaimerContent = await getWebsiteContent('disclaimer');
        
        state.websiteContent.about = aboutContent ? aboutContent.content : '';
        state.websiteContent.contact = contactContent ? contactContent.content : '';
        state.websiteContent.disclaimer = disclaimerContent ? disclaimerContent.content : '';
        
        renderWebsiteContent();
    } catch (error) {
        console.error('Error loading website content:', error);
    }
}

function renderWebsiteContent() {
    // About section
    const aboutContent = document.getElementById('aboutContent');
    if (aboutContent) {
        aboutContent.innerHTML = state.websiteContent.about || '<p>About content coming soon...</p>';
    }
    
    // Contact section
    const contactContent = document.getElementById('contactContent');
    if (contactContent) {
        contactContent.innerHTML = state.websiteContent.contact || '<p>Contact information coming soon...</p>';
    }
    
    // Disclaimer modal
    const disclaimerDisplayContent = document.getElementById('disclaimerDisplayContent');
    if (disclaimerDisplayContent) {
        disclaimerDisplayContent.innerHTML = state.websiteContent.disclaimer || '<p>Disclaimer content coming soon...</p>';
    }
}

// === Blog Post Modals ===
function showAddBlogPostModal() {
    state.editingBlogPostId = null;
    
    document.getElementById('blogModalTitle').textContent = 'Add Blog Post';
    document.getElementById('blogPostForm').reset();
    
    showModal('blogPostModal');
}

async function showEditBlogPostModal(id) {
    const post = state.currentBlogPosts.find(p => p.id === id);
    if (!post) return;
    
    state.editingBlogPostId = id;
    
    document.getElementById('blogModalTitle').textContent = 'Edit Blog Post';
    document.getElementById('blogTitleInput').value = post.title;
    document.getElementById('blogContentInput').value = post.content;
    document.getElementById('blogExcerptInput').value = post.excerpt || '';
    document.getElementById('blogStatusInput').value = post.status;
    
    showModal('blogPostModal');
}

function hideBlogPostModal() {
    hideModal('blogPostModal');
    state.editingBlogPostId = null;
}

function showBlogPostModal(index) {
    const post = state.currentBlogPosts[index];
    if (!post) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3 class="modal-title">${post.title}</h3>
                <button class="icon-btn close-modal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body">
                <p class="text-muted">${new Date(post.createdAt).toLocaleDateString()}</p>
                <div class="blog-post-full-content">
                    ${post.content.replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.close-modal');
    const overlay = modal.querySelector('.modal-overlay');
    
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    overlay.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// === Content Management Modals ===
async function showAboutContentModal() {
    const aboutContent = document.getElementById('aboutContentInput');
    if (aboutContent) {
        aboutContent.value = state.websiteContent.about;
    }
    showModal('aboutContentModal');
}

function hideAboutContentModal() {
    hideModal('aboutContentModal');
}

async function showContactContentModal() {
    const contactContent = document.getElementById('contactContentInput');
    if (contactContent) {
        contactContent.value = state.websiteContent.contact;
    }
    showModal('contactContentModal');
}

function hideContactContentModal() {
    hideModal('contactContentModal');
}

async function showDisclaimerContentModal() {
    const disclaimerContent = document.getElementById('disclaimerContentInput');
    if (disclaimerContent) {
        disclaimerContent.value = state.websiteContent.disclaimer;
    }
    showModal('disclaimerContentModal');
}

function hideDisclaimerContentModal() {
    hideModal('disclaimerContentModal');
}

function showBlogPostsModal() {
    loadBlogPostsList();
    showModal('blogPostsModal');
}

function hideBlogPostsModal() {
    hideModal('blogPostsModal');
}

// === Save Functions ===
async function saveBlogPost(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('blogTitleInput').value.trim(),
        content: document.getElementById('blogContentInput').value.trim(),
        excerpt: document.getElementById('blogExcerptInput').value.trim(),
        status: document.getElementById('blogStatusInput').value,
        updatedAt: new Date()
    };
    
    if (!formData.title || !formData.content) {
        alert('Please fill in all required fields.');
        return;
    }
    
    try {
        showLoading();
        
        if (state.editingBlogPostId) {
            const existingPost = state.currentBlogPosts.find(p => p.id === state.editingBlogPostId);
            await updateBlogPost(state.editingBlogPostId, {
                ...existingPost,
                ...formData
            });
        } else {
            formData.createdAt = new Date();
            await addBlogPost(formData);
        }
        
        hideBlogPostModal();
        await loadBlogPosts();
        hideLoading();
    } catch (error) {
        console.error('Error saving blog post:', error);
        alert('Failed to save blog post. Please try again.');
        hideLoading();
    }
}

async function saveAboutContent(e) {
    e.preventDefault();
    
    const content = document.getElementById('aboutContentInput').value.trim();
    
    if (!content) {
        alert('Please enter about content.');
        return;
    }
    
    try {
        showLoading();
        await updateWebsiteContent('about', content);
        await loadWebsiteContent();
        hideAboutContentModal();
        hideLoading();
    } catch (error) {
        console.error('Error saving about content:', error);
        alert('Failed to save about content. Please try again.');
        hideLoading();
    }
}

async function saveContactContent(e) {
    e.preventDefault();
    
    const content = document.getElementById('contactContentInput').value.trim();
    
    if (!content) {
        alert('Please enter contact content.');
        return;
    }
    
    try {
        showLoading();
        await updateWebsiteContent('contact', content);
        await loadWebsiteContent();
        hideContactContentModal();
        hideLoading();
    } catch (error) {
        console.error('Error saving contact content:', error);
        alert('Failed to save contact content. Please try again.');
        hideLoading();
    }
}

async function saveDisclaimerContent(e) {
    e.preventDefault();
    
    const content = document.getElementById('disclaimerContentInput').value.trim();
    
    if (!content) {
        alert('Please enter disclaimer content.');
        return;
    }
    
    try {
        showLoading();
        await updateWebsiteContent('disclaimer', content);
        await loadWebsiteContent();
        hideDisclaimerContentModal();
        hideLoading();
    } catch (error) {
        console.error('Error saving disclaimer content:', error);
        alert('Failed to save disclaimer content. Please try again.');
        hideLoading();
    }
}

// === Lightbox ===
function openLightbox(index) {
    state.selectedPaintingIndex = index;
    const painting = state.currentPaintings[index];
    
    const lightbox = document.getElementById('lightbox');
    const image = document.getElementById('lightboxImage');
    
    if (!lightbox || !image) return;
    
    image.src = URL.createObjectURL(painting.displayBlob);
    image.alt = painting.title;
    
    document.getElementById('lightboxTitle').textContent = painting.title;
    document.getElementById('lightboxYear').textContent = painting.year || 'N/A';
    document.getElementById('lightboxMedium').textContent = painting.medium || 'N/A';
    document.getElementById('lightboxSize').textContent = painting.size || 'N/A';
    document.getElementById('lightboxDescription').textContent = painting.description || '';
    
    const tagsHtml = (painting.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');
    document.getElementById('lightboxTags').innerHTML = tagsHtml;
    
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeLightboxFunc() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.add('hidden');
        document.body.style.overflow = '';
        state.selectedPaintingIndex = -1;
    }
}

function showPreviousPainting() {
    if (state.selectedPaintingIndex > 0) {
        openLightbox(state.selectedPaintingIndex - 1);
    }
}

function showNextPainting() {
    if (state.selectedPaintingIndex < state.currentPaintings.length - 1) {
        openLightbox(state.selectedPaintingIndex + 1);
    }
}

function editCurrentPainting() {
    const painting = state.currentPaintings[state.selectedPaintingIndex];
    closeLightboxFunc();
    showEditPaintingModal(painting);
}

async function deleteCurrentPainting() {
    if (!confirm('Are you sure you want to delete this painting? This action cannot be undone.')) {
        return;
    }
    
    const painting = state.currentPaintings[state.selectedPaintingIndex];
    
    try {
        await deletePainting(painting.id);
        closeLightboxFunc();
        await loadPaintings();
    } catch (error) {
        console.error('Error deleting painting:', error);
        alert('Failed to delete painting. Please try again.');
    }
}

// === Painting Form ===
function showAddPaintingModal() {
    state.editingPaintingId = null;
    state.currentImageData = null;
    
    document.getElementById('modalTitle').textContent = 'Add Painting';
    document.getElementById('paintingForm').reset();
    document.getElementById('dropzoneContent').classList.remove('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
    
    showModal('paintingModal');
}

async function showEditPaintingModal(painting) {
    state.editingPaintingId = painting.id;
    
    document.getElementById('modalTitle').textContent = 'Edit Painting';
    document.getElementById('titleInput').value = painting.title;
    document.getElementById('yearInput').value = painting.year || '';
    document.getElementById('mediumInput').value = painting.medium || '';
    document.getElementById('sizeInput').value = painting.size || '';
    document.getElementById('categoryInput').value = painting.category || '';
    document.getElementById('visibilityInput').value = painting.visibility;
    document.getElementById('descriptionInput').value = painting.description || '';
    document.getElementById('tagsInput').value = (painting.tags || []).join(', ');
    
    const imageUrl = URL.createObjectURL(painting.displayBlob);
    document.getElementById('previewImg').src = imageUrl;
    document.getElementById('dropzoneContent').classList.add('hidden');
    document.getElementById('imagePreview').classList.remove('hidden');
    
    state.currentImageData = {
        thumbnailBlob: painting.thumbnailBlob,
        displayBlob: painting.displayBlob,
        lqip: painting.lqip
    };
    
    showModal('paintingModal');
}

function hidePaintingModal() {
    hideModal('paintingModal');
    state.editingPaintingId = null;
    state.currentImageData = null;
}

// === Background Form ===
function showAddBackgroundModal() {
    state.currentBackgroundImageData = null;
    
    document.getElementById('backgroundForm').reset();
    document.getElementById('backgroundDropzoneContent').classList.remove('hidden');
    document.getElementById('backgroundImagePreview').classList.add('hidden');
    
    showModal('backgroundModal');
}

function hideBackgroundModal() {
    hideModal('backgroundModal');
    state.currentBackgroundImageData = null;
}

// === Save Painting ===
async function savePainting(e) {
    e.preventDefault();
    
    if (!state.currentImageData) {
        alert('Please select an image.');
        return;
    }
    
    const formData = {
        title: document.getElementById('titleInput').value.trim(),
        year: parseInt(document.getElementById('yearInput').value) || null,
        medium: document.getElementById('mediumInput').value.trim(),
        size: document.getElementById('sizeInput').value.trim(),
        category: document.getElementById('categoryInput').value,
        visibility: document.getElementById('visibilityInput').value,
        description: document.getElementById('descriptionInput').value.trim(),
        tags: document.getElementById('tagsInput').value.split(',').map(t => t.trim()).filter(t => t),
        thumbnailBlob: state.currentImageData.thumbnailBlob,
        displayBlob: state.currentImageData.displayBlob,
        lqip: state.currentImageData.lqip,
        updatedAt: new Date()
    };
    
    try {
        showLoading();
        
        if (state.editingPaintingId) {
            await updatePainting(state.editingPaintingId, formData);
        } else {
            formData.createdAt = new Date();
            await addPainting(formData);
        }
        
        hidePaintingModal();
        await loadPaintings();
        hideLoading();
    } catch (error) {
        console.error('Error saving painting:', error);
        alert('Failed to save painting. Please try again.');
        hideLoading();
    }
}

// === Save Background ===
async function saveBackground(e) {
    e.preventDefault();
    
    if (!state.currentBackgroundImageData) {
        alert('Please select an image.');
        return;
    }
    
    const name = document.getElementById('backgroundNameInput').value.trim() || 'Background Image';
    
    try {
        showLoading();
        
        await addBackground({
            name: name,
            imageBlob: state.currentBackgroundImageData.imageBlob,
            createdAt: new Date()
        });
        
        hideBackgroundModal();
        await loadBackgroundsList();
        await loadBackgrounds(); // Reload backgrounds and update slideshow
        hideLoading();
    } catch (error) {
        console.error('Error saving background:', error);
        alert('Failed to save background image. Please try again.');
        hideLoading();
    }
}

// === Import/Export ===
async function exportData() {
    try {
        showLoading();
        
        const paintings = await getAllPaintings();
        const blogPosts = await getAllBlogPosts();
        const websiteContent = await getAllWebsiteContent();
        
        const exportData = {
            version: CONFIG.DB_VERSION,
            exported: new Date().toISOString(),
            paintings: await Promise.all(paintings.map(async (painting) => {
                return {
                    ...painting,
                    thumbnailBlob: await blobToBase64(painting.thumbnailBlob),
                    displayBlob: await blobToBase64(painting.displayBlob)
                };
            })),
            blogPosts: blogPosts,
            websiteContent: websiteContent
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dynastyin-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        hideLoading();
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export data. Please try again.');
        hideLoading();
    }
}

async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        showLoading();
        
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.paintings || !Array.isArray(data.paintings)) {
            throw new Error('Invalid backup file format');
        }
        
        if (!confirm(`This will import ${data.paintings.length} paintings and other content. Continue?`)) {
            hideLoading();
            return;
        }
        
        // Import paintings
        for (const painting of data.paintings) {
            const paintingData = {
                ...painting,
                id: undefined,
                thumbnailBlob: await base64ToBlob(painting.thumbnailBlob),
                displayBlob: await base64ToBlob(painting.displayBlob),
                createdAt: new Date(painting.createdAt),
                updatedAt: new Date(painting.updatedAt)
            };
            await addPainting(paintingData);
        }
        
        // Import blog posts if available
        if (data.blogPosts && Array.isArray(data.blogPosts)) {
            for (const post of data.blogPosts) {
                const postData = {
                    ...post,
                    id: undefined,
                    createdAt: new Date(post.createdAt),
                    updatedAt: new Date(post.updatedAt)
                };
                await addBlogPost(postData);
            }
        }
        
        // Import website content if available
        if (data.websiteContent && Array.isArray(data.websiteContent)) {
            for (const content of data.websiteContent) {
                await updateWebsiteContent(content.type, content.content);
            }
        }
        
        await loadPaintings();
        await loadBlogPosts();
        await loadWebsiteContent();
        alert(`Successfully imported ${data.paintings.length} paintings and other content!`);
        hideLoading();
    } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import data. Please check the file and try again.');
        hideLoading();
    }
    
    e.target.value = '';
}

// === Utility Functions ===
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function base64ToBlob(base64) {
    return fetch(base64).then(res => res.blob());
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function showLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('hidden');
    }
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
}

function handleKeyPress(e) {
    const lightbox = document.getElementById('lightbox');
    
    if (lightbox && !lightbox.classList.contains('hidden')) {
        switch(e.key) {
            case 'Escape':
                closeLightboxFunc();
                break;
            case 'ArrowLeft':
                showPreviousPainting();
                break;
            case 'ArrowRight':
                showNextPainting();
                break;
        }
    }
}
