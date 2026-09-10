/* ==============================================================================
   EROCORE WEB STUDIO — MASTER JAVASCRIPT (V2.2)
   ==============================================================================
   Mimar           : Lead WebGL & UX Architect
   Özellikler      : Three.js Lüks İnteraktif Siber Ağ & Dalga Sahnesi (Küre Yok)
                     assets/sounds/ Bildirim Sesi + Web Audio Sentezleyici Fallback
                     Sadeleştirilmiş Dropdown Navbar & Mobil Drawer
                     Canlı İnteraktif Fiyat Hesaplayıcı Widget
                     Sayfa Scroll İlerleme Barı & Floating WhatsApp
                     GSAP ScrollTrigger, SSS Akordeon & Form Entegrasyonu
   ============================================================================== */

(function () {
    'use strict';

    /* ============================================================
       01 · KONFİGÜRASYON VE GLOBAL DURUM
       ============================================================ */
    const CONFIG = {
        colors: {
            deep: 0x05080f,
            gold: 0xd7b15a,
            goldSoft: 0xf0d998,
            cyan: 0x7ee7ff,
            cyanSoft: 0xc6f7ff,
            white: 0xffffff
        },
        camera: {
            fov: 60,
            near: 0.1,
            far: 100,
            baseZ: 12
        }
    };

    const State = {
        scene: null,
        camera: null,
        renderer: null,
        clock: null,
        group: null,

        // Ağ ve Dalga Elemanları
        particles: null,
        particlePositions: null,
        particleVelocities: [],
        particleCount: 220,
        linesMesh: null,
        waveMesh: null,
        waveGeometry: null,

        // Işıklar
        lightGold: null,
        lightCyan: null,

        // Etkileşim
        rafId: null,
        mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },

        // Cihaz & Performans
        isMobile: false,
        fps: { frames: 0, lastTime: 0, current: 60, degraded: false },

        // Ses Sistemi
        soundEnabled: true,
        audioCtx: null
    };

    /* ============================================================
       02 · CİHAZ TESPİTİ & PERFORMANS
       ============================================================ */
    const Device = {
        init() {
            State.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            ) || window.innerWidth < 768;

            State.particleCount = State.isMobile ? 120 : 220;
        },

        getPixelRatio() {
            return Math.min(window.devicePixelRatio || 1, State.isMobile ? 1.5 : 2);
        }
    };

    /* ============================================================
       03 · THREE.JS — ULTRA LÜKS SİBER AĞ & DALGA SAHNESİ
       ============================================================ */
    const ThreeScene = {
        init() {
            if (!window.THREE) {
                console.warn('[EroCore] Three.js yüklenemedi. 3D arka plan atlandı.');
                return false;
            }

            const container = document.getElementById('canvas-container');
            if (!container) return false;

            const width = window.innerWidth;
            const height = window.innerHeight;

            State.scene = new THREE.Scene();
            State.scene.fog = new THREE.FogExp2(CONFIG.colors.deep, 0.032);

            State.camera = new THREE.PerspectiveCamera(
                CONFIG.camera.fov,
                width / height,
                CONFIG.camera.near,
                CONFIG.camera.far
            );
            State.camera.position.set(0, 1.5, State.isMobile ? 14 : CONFIG.camera.baseZ);

            State.renderer = new THREE.WebGLRenderer({
                antialias: !State.isMobile,
                alpha: true,
                powerPreference: 'high-performance'
            });
            State.renderer.setSize(width, height);
            State.renderer.setPixelRatio(Device.getPixelRatio());
            State.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            State.renderer.toneMappingExposure = 1.15;

            container.innerHTML = '';
            container.appendChild(State.renderer.domElement);

            State.clock = new THREE.Clock();
            State.group = new THREE.Group();
            State.scene.add(State.group);

            this.setupLights();
            this.setupConstellation();
            this.setupDigitalWave();

            return true;
        },

        setupLights() {
            const ambient = new THREE.AmbientLight(0xffffff, 0.4);
            State.scene.add(ambient);

            State.lightGold = new THREE.PointLight(CONFIG.colors.gold, 2.2, 35);
            State.lightGold.position.set(6, 6, 6);
            State.scene.add(State.lightGold);

            State.lightCyan = new THREE.PointLight(CONFIG.colors.cyan, 1.8, 35);
            State.lightCyan.position.set(-6, -4, 4);
            State.scene.add(State.lightCyan);
        },

        setupConstellation() {
            const count = State.particleCount;
            const geometry = new THREE.BufferGeometry();
            State.particlePositions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);

            const gold = new THREE.Color(CONFIG.colors.gold);
            const cyan = new THREE.Color(CONFIG.colors.cyan);

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                State.particlePositions[i3] = (Math.random() - 0.5) * 34;
                State.particlePositions[i3 + 1] = (Math.random() - 0.5) * 22;
                State.particlePositions[i3 + 2] = (Math.random() - 0.5) * 20;

                State.particleVelocities.push({
                    x: (Math.random() - 0.5) * 0.015,
                    y: (Math.random() - 0.5) * 0.015,
                    z: (Math.random() - 0.5) * 0.012
                });

                const c = Math.random() > 0.3 ? gold : cyan;
                colors[i3] = c.r;
                colors[i3 + 1] = c.g;
                colors[i3 + 2] = c.b;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(State.particlePositions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({
                size: State.isMobile ? 0.12 : 0.15,
                vertexColors: true,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending
            });

            State.particles = new THREE.Points(geometry, material);
            State.group.add(State.particles);

            const maxConnections = count * 6;
            const lineGeometry = new THREE.BufferGeometry();
            const linePositions = new Float32Array(maxConnections * 3);
            const lineColors = new Float32Array(maxConnections * 3);

            lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
            lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));

            const lineMaterial = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending
            });

            State.linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
            State.group.add(State.linesMesh);
        },

        setupDigitalWave() {
            const segX = State.isMobile ? 32 : 48;
            const segY = State.isMobile ? 32 : 48;
            const waveGeo = new THREE.PlaneGeometry(50, 45, segX, segY);

            const waveMat = new THREE.MeshBasicMaterial({
                color: CONFIG.colors.gold,
                wireframe: true,
                transparent: true,
                opacity: 0.12
            });

            State.waveMesh = new THREE.Mesh(waveGeo, waveMat);
            State.waveMesh.rotation.x = -Math.PI / 2.3;
            State.waveMesh.position.set(0, -5.5, -4);
            State.group.add(State.waveMesh);
            State.waveGeometry = waveGeo;
        },

        render() {
            if (!State.renderer || !State.scene || !State.camera) return;

            const time = State.clock.getElapsedTime();

            // 1. Partiküller ve Dinamik Çizgi Ağı
            if (State.particles && State.particlePositions) {
                const count = State.particleCount;
                const pos = State.particlePositions;
                let lineIndex = 0;

                const linePos = State.linesMesh.geometry.attributes.position.array;
                const lineCol = State.linesMesh.geometry.attributes.color.array;

                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    const v = State.particleVelocities[i];

                    pos[i3] += v.x;
                    pos[i3 + 1] += v.y;
                    pos[i3 + 2] += v.z;

                    if (Math.abs(pos[i3]) > 17) v.x *= -1;
                    if (Math.abs(pos[i3 + 1]) > 11) v.y *= -1;
                    if (Math.abs(pos[i3 + 2]) > 10) v.z *= -1;

                    for (let j = i + 1; j < count; j++) {
                        const j3 = j * 3;
                        const dx = pos[i3] - pos[j3];
                        const dy = pos[i3 + 1] - pos[j3 + 1];
                        const dz = pos[i3 + 2] - pos[j3 + 2];
                        const distSq = dx * dx + dy * dy + dz * dz;

                        if (distSq < 10.2 && lineIndex < linePos.length - 6) {
                            const alpha = 1.0 - Math.sqrt(distSq) / 3.2;

                            linePos[lineIndex] = pos[i3];
                            linePos[lineIndex + 1] = pos[i3 + 1];
                            linePos[lineIndex + 2] = pos[i3 + 2];

                            lineCol[lineIndex] = 0.84 * alpha;
                            lineCol[lineIndex + 1] = 0.69 * alpha;
                            lineCol[lineIndex + 2] = 0.35 * alpha;

                            linePos[lineIndex + 3] = pos[j3];
                            linePos[lineIndex + 4] = pos[j3 + 1];
                            linePos[lineIndex + 5] = pos[j3 + 2];

                            lineCol[lineIndex + 3] = 0.49 * alpha;
                            lineCol[lineIndex + 4] = 0.91 * alpha;
                            lineCol[lineIndex + 5] = 1.0 * alpha;

                            lineIndex += 6;
                        }
                    }
                }

                State.particles.geometry.attributes.position.needsUpdate = true;
                State.linesMesh.geometry.setDrawRange(0, lineIndex / 3);
                State.linesMesh.geometry.attributes.position.needsUpdate = true;
                State.linesMesh.geometry.attributes.color.needsUpdate = true;
            }

            // 2. Siber Dalga Zemin Salınımı
            if (State.waveGeometry) {
                const pos = State.waveGeometry.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                    const u = pos.getX(i) * 0.18;
                    const v = pos.getY(i) * 0.18;
                    const waveZ = Math.sin(u + time * 0.8) * Math.cos(v + time * 0.6) * 1.4;
                    pos.setZ(i, waveZ);
                }
                State.waveGeometry.attributes.position.needsUpdate = true;
            }

            // 3. Işıkların Yörüngesi
            if (State.lightGold && State.lightCyan) {
                State.lightGold.position.x = Math.sin(time * 0.4) * 10;
                State.lightGold.position.y = Math.cos(time * 0.3) * 6;
                State.lightCyan.position.x = -Math.cos(time * 0.35) * 10;
                State.lightCyan.position.y = -Math.sin(time * 0.4) * 6;
            }

            // 4. Parallax
            State.mouse.x += (State.mouse.targetX - State.mouse.x) * 0.05;
            State.mouse.y += (State.mouse.targetY - State.mouse.y) * 0.05;

            State.group.rotation.y = State.mouse.x * 0.25;
            State.group.rotation.x = -State.mouse.y * 0.18;

            const scrollOffset = (window.scrollY || window.pageYOffset || 0) * 0.0035;
            State.camera.position.y = 1.5 - scrollOffset * 0.8;
            State.camera.position.z = (State.isMobile ? 14 : CONFIG.camera.baseZ) - scrollOffset * 0.5;

            State.renderer.render(State.scene, State.camera);
        },

        onResize() {
            if (!State.renderer || !State.camera) return;
            const width = window.innerWidth;
            const height = window.innerHeight;

            State.camera.aspect = width / height;
            State.camera.updateProjectionMatrix();
            State.renderer.setSize(width, height);
            State.renderer.setPixelRatio(Device.getPixelRatio());
        }
    };

    /* ============================================================
       04 · ANİMASYON DÖNGÜSÜ & FPS GUARD
       ============================================================ */
    function animate() {
        State.rafId = requestAnimationFrame(animate);

        const now = performance.now();
        State.fps.frames++;
        if (now >= State.fps.lastTime + 1000) {
            State.fps.current = Math.round((State.fps.frames * 1000) / (now - State.fps.lastTime));
            State.fps.frames = 0;
            State.fps.lastTime = now;

            if (State.fps.current < 35 && !State.fps.degraded && State.renderer) {
                State.fps.degraded = true;
                State.renderer.setPixelRatio(1);
                if (State.linesMesh) State.linesMesh.visible = false;
            }
        }

        ThreeScene.render();
    }

    /* ============================================================
       05 · SPLASH LOADER
       ============================================================ */
    const Splash = {
        init() {
            const splash = document.getElementById('splash-screen');
            const bar = document.getElementById('splash-progress-bar');
            const percent = document.getElementById('splash-percent');
            const mainContent = document.getElementById('main-content');

            if (!splash) return;

            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.floor(Math.random() * 18) + 8;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);

                    if (bar) bar.style.width = '100%';
                    if (percent) percent.textContent = '100%';

                    setTimeout(() => {
                        splash.classList.add('hidden');
                        if (mainContent) {
                            mainContent.classList.add('loaded');
                            if (window.gsap) {
                                gsap.to(mainContent, { opacity: 1, duration: 0.9, ease: 'power2.out' });
                            }
                        }
                        Notification.show();
                    }, 400);
                } else {
                    if (bar) bar.style.width = progress + '%';
                    if (percent) percent.textContent = progress + '%';
                }
            }, 60);

            splash.addEventListener('click', () => {
                clearInterval(interval);
                splash.classList.add('hidden');
                if (mainContent) {
                    mainContent.classList.add('loaded');
                    mainContent.style.opacity = '1';
                }
                Notification.show();
            });
        }
    };

    /* ============================================================
       06 · GELİŞMİŞ BİLDİRİM VE OTOMATİK SES SİSTEMİ (ASSETS/SOUNDS)
       ============================================================ */
    const Notification = {
        hasShown: false,
        audioUnlocked: false,

        init() {
            const closeBtn = document.getElementById('notifClose');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.hide();
                });
            }

            // Sayfadaki ilk ortam etkileşiminde (hareket, dokunma, kaydırma) ses kanalını otomatik aç
            const unlockAudioHandler = () => {
                if (this.audioUnlocked) return;
                this.audioUnlocked = true;
                this.initAudioContext();
                if (State.audioCtx && State.audioCtx.state === 'suspended') {
                    State.audioCtx.resume();
                }
                const silentAudio = new Audio('notification.mp3');
            silentAudio.volume = 0.001;
            const p = silentAudio.play();
            if (p !== undefined) {
                p.then(() => {
                    silentAudio.pause();
                    silentAudio.currentTime = 0;
                }).catch(() => {
                    const fallbackAudio = new Audio('assets/sounds/notification.mp3');
                    fallbackAudio.volume = 0.001;
                    const p2 = fallbackAudio.play();
                    if (p2 !== undefined) {
                        p2.then(() => { fallbackAudio.pause(); }).catch(() => {});
                    }
                });
            }
                silentAudio.muted = true;
                silentAudio.play().then(() => {
                    silentAudio.pause();
                    silentAudio.muted = false;
                }).catch(() => {});
            };

            ['pointerdown', 'touchstart', 'scroll', 'keydown', 'mousemove'].forEach((evt) => {
                window.addEventListener(evt, unlockAudioHandler, { once: true, passive: true });
            });

            // Ses Açma/Kapama Düğmesi
            const soundBtn = document.getElementById('navSoundBtn');
            const soundBtnMobile = document.getElementById('mobileSoundBtn');

            const toggleSound = () => {
                State.soundEnabled = !State.soundEnabled;
                const label = State.soundEnabled ? '🔊 Ses' : '🔇 Sessiz';
                if (soundBtn) soundBtn.textContent = label;
                if (soundBtnMobile) soundBtnMobile.textContent = label;

                if (State.soundEnabled) {
                    this.playSound();
                }
            };

            if (soundBtn) soundBtn.addEventListener('click', toggleSound);
            if (soundBtnMobile) soundBtnMobile.addEventListener('click', toggleSound);
        },

        initAudioContext() {
            if (State.audioCtx) return;
            try {
                State.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {}
        },

                playSound() {
            if (!State.soundEnabled) return;

            // 1. Öncelik: Ana dizindeki notification.mp3, ardından assets/sounds/notification.mp3
            const tryAudio = (src, fallback) => {
                const audio = new Audio(src);
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        if (fallback) fallback();
                        else this.playSynthChime();
                    });
                } else {
                    if (fallback) fallback();
                }
            };

            tryAudio('notification.mp3', () => {
                tryAudio('assets/sounds/notification.mp3', () => {
                    this.playSynthChime();
                });
            });
        },

        playSynthChime() {
            this.initAudioContext();
            if (!State.audioCtx) return;

            try {
                const now = State.audioCtx.currentTime;
                const osc1 = State.audioCtx.createOscillator();
                const osc2 = State.audioCtx.createOscillator();
                const gain = State.audioCtx.createGain();

                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(State.audioCtx.destination);

                osc1.type = 'sine';
                osc2.type = 'triangle';

                osc1.frequency.setValueAtTime(880, now);
                osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

                osc2.frequency.setValueAtTime(1760, now);
                osc2.frequency.exponentialRampToValueAtTime(880, now + 0.25);

                gain.gain.setValueAtTime(0.14, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.42);
                osc2.stop(now + 0.42);
            } catch (e) {}
        },

        show() {
            if (this.hasShown) return;
            this.hasShown = true;

            const el = document.getElementById('notification');
            if (!el) return;

            setTimeout(() => {
                el.classList.add('show');
                el.classList.remove('hide');
                this.playSound();

                setTimeout(() => this.hide(), 9500);
            }, 650);
        },

        hide() {
            const el = document.getElementById('notification');
            if (!el) return;
            el.classList.remove('show');
            el.classList.add('hide');
        }
    };

    /* ============================================================
       07 · CANLI İNTERAKTİF FİYAT HESAPLAYICI (CALCULATOR)
       ============================================================ */
        /* ============================================================
       07 · İLERİ SEVİYE MİNİ CRM & İNTERAKTİF TEKLİF MOTORU
       ============================================================ */
    const QuoteEngine = {
        state: {
            currentStep: 1,
            projectType: 'kurumsal',
            projectTypeName: 'Kurumsal Web Sitesi',
            designLevel: 'premium',
            designLevelName: 'Ultra Premium / 3D & Dark Luxe',
            pageCount: 6,
            selectedFeatures: new Set(),
            initialized: false,
            budgetPreference: 'optimal',
            urgency: 'normal',
            // Brief Formu
            clientName: '',
            clientCompany: '',
            clientEmail: '',
            clientPhone: '',
            clientNotes: ''
        },

        prices: {
            base: {
                kurumsal: 14500,
                ecommerce: 21500,
                saas: 24500,
                landing: 5500,
                portfolio: 6500,
                booking: 15500,
                blog: 11500,
                custom: 28500
            },
            designMultiplier: {
                standart: 1.0,
                custom: 1.22,
                premium: 1.42
            },
            features: {
                // Tasarım & Animasyon
                threeD: { name: 'Three.js / 3D İnteraktif Vitrin', price: 9000, days: 3 },
                gsap: { name: 'GSAP Sinematik Mikro Animasyonlar', price: 3500, days: 1 },
                darkMode: { name: 'Dark & Light Mode İkili Tema', price: 2000, days: 1 },
                vectorIcons: { name: 'Özel Vektör İkonografi & İllüstrasyon', price: 1800, days: 1 },
                // E-Ticaret & Ödeme
                cartPayment: { name: 'E-Ticaret & İyzico/PayTR Sanal POS', price: 16000, days: 5 },
                productFilter: { name: 'Gelişmiş Ürün & Varyasyon Filtresi', price: 4500, days: 2 },
                // Kullanıcı & Üyelik
                userAuth: { name: 'Kullanıcı Kayıt, Giriş & Profil Paneli', price: 7500, days: 3 },
                roleAuth: { name: 'Rol Bazlı Çoklu Yetkilendirme (RBAC)', price: 5500, days: 2 },
                // Rezervasyon & Randevu
                bookingSys: { name: 'Online Takvimli Randevu ve SMS Onayı', price: 11000, days: 4 },
                // Akıllı & Yapay Zeka
                aiChatbot: { name: 'Yapay Zeka (OpenAI/Gemini) Chatbot', price: 8500, days: 3 },
                aiSearch: { name: 'AI Semantik Arama ve Akıllı Öneri', price: 6500, days: 2 },
                // Entegrasyon & API
                googleTools: { name: 'Google Analytics, Search Console & Harita', price: 1500, days: 1 },
                crmApi: { name: 'CRM / ERP & REST API Bağlantısı', price: 9500, days: 3 },
                // SEO & Performans
                techSeo: { name: 'İleri Düzey Teknik SEO & Şema Verisi', price: 3500, days: 1 },
                // Çoklu Dil
                multiLang: { name: 'Çoklu Dil Altyapısı (EN / DE / TR)', price: 6000, days: 2 },
                // Yönetim Paneli
                customAdmin: { name: 'Özel Yönetim Paneli (CMS) & Dashboard', price: 12000, days: 4 },
                // Bakım
                monthlyCare: { name: 'Aylık Düzenli Güvenlik & Bakım Paketi', price: 2500, days: 0 }
            }
        },

        init() {
            this.initStepNavigation();
            this.initProjectTypeSelection();
            this.initDesignLevelSelection();
            this.initPageSlider();
            this.initFeatureChips();
            this.initFeatureCategories();
            this.initBriefForm();
            this.initResetButton();
            this.reset();
        },

        initResetButton() {
            const button = document.getElementById('quoteResetBtn');
            if (!button) return;

            button.addEventListener('click', () => {
                this.reset();
            });
        },

        reset() {
            this.state.currentStep = 1;
            this.state.projectType = 'kurumsal';
            this.state.projectTypeName = 'Kurumsal Web Sitesi';
            this.state.designLevel = 'premium';
            this.state.designLevelName = 'Ultra Premium / 3D & Dark Luxe';
            this.state.pageCount = 6;
            this.state.selectedFeatures = new Set();
            this.state.initialized = false;

            document.querySelectorAll('.project-type-card').forEach((card) => {
                card.classList.remove('selected');
            });

            document.querySelectorAll('.design-level-card').forEach((card) => {
                card.classList.remove('selected');
            });

            const slider = document.getElementById('quotePageSlider');
            if (slider) slider.value = '6';

            const display = document.getElementById('quotePageDisplay');
            if (display) display.textContent = '6 Sayfa';

            document.querySelectorAll('.feature-chip-item').forEach((chip) => {
                chip.classList.remove('selected');
                chip.style.display = 'flex';
            });

            document.querySelectorAll('.feature-cat-btn').forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.cat === 'all');
            });

            document.querySelectorAll('.quote-step-item').forEach((item, index) => {
                item.classList.toggle('active', index === 0);
            });

            document.querySelectorAll('.quote-step-pane').forEach((pane, index) => {
                pane.classList.toggle('active', index === 0);
            });

            this.calculate();
        },

        initStepNavigation() {
            const stepItems = document.querySelectorAll('.quote-step-item');
            const stepPanes = document.querySelectorAll('.quote-step-pane');
            const nextBtns = document.querySelectorAll('.quote-next-step');
            const prevBtns = document.querySelectorAll('.quote-prev-step');

            const setStep = (stepNum) => {
                this.state.currentStep = stepNum;
                stepItems.forEach((item, idx) => {
                    item.classList.toggle('active', idx + 1 === stepNum);
                });
                stepPanes.forEach((pane, idx) => {
                    pane.classList.toggle('active', idx + 1 === stepNum);
                });
            };

            stepItems.forEach((item) => {
                item.addEventListener('click', () => {
                    const target = parseInt(item.dataset.step, 10);
                    if (target) setStep(target);
                });
            });

            nextBtns.forEach((btn) => {
                btn.addEventListener('click', () => {
                    if (this.state.currentStep < 4) {
                        setStep(this.state.currentStep + 1);
                    }
                });
            });

            prevBtns.forEach((btn) => {
                btn.addEventListener('click', () => {
                    if (this.state.currentStep > 1) {
                        setStep(this.state.currentStep - 1);
                    }
                });
            });
        },

        initProjectTypeSelection() {
            const cards = document.querySelectorAll('.project-type-card');
            cards.forEach((card) => {
                card.addEventListener('click', () => {
                    cards.forEach((c) => c.classList.remove('selected'));
                    card.classList.add('selected');
                    this.state.projectType = card.dataset.type || 'kurumsal';
                    this.state.projectTypeName = card.querySelector('h5')?.textContent || 'Kurumsal';
                    this.state.initialized = true;
                    this.calculate();
                });
            });
        },

        initDesignLevelSelection() {
            const cards = document.querySelectorAll('.design-level-card');
            cards.forEach((card) => {
                card.addEventListener('click', () => {
                    cards.forEach((c) => c.classList.remove('selected'));
                    card.classList.add('selected');
                    this.state.designLevel = card.dataset.level || 'premium';
                    this.state.designLevelName = card.querySelector('.design-level-title')?.textContent || 'Premium';
                    this.state.initialized = true;
                    this.calculate();
                });
            });
        },

        initPageSlider() {
            const slider = document.getElementById('quotePageSlider');
            const display = document.getElementById('quotePageDisplay');
            if (!slider) return;

            slider.addEventListener('input', (e) => {
                this.state.pageCount = parseInt(e.target.value, 10) || 6;
                this.state.initialized = true;
                if (display) display.textContent = this.state.pageCount + ' Sayfa';
                this.calculate();
            });
        },

        initFeatureCategories() {
            const catBtns = document.querySelectorAll('.feature-cat-btn');
            const chips = document.querySelectorAll('.feature-chip-item');

            catBtns.forEach((btn) => {
                btn.addEventListener('click', () => {
                    catBtns.forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    const cat = btn.dataset.cat;

                    chips.forEach((chip) => {
                        if (cat === 'all' || chip.dataset.cat === cat) {
                            chip.style.display = 'flex';
                        } else {
                            chip.style.display = 'none';
                        }
                    });
                });
            });
        },

        initFeatureChips() {
            const chips = document.querySelectorAll('.feature-chip-item');
            chips.forEach((chip) => {
                chip.addEventListener('click', () => {
                    const key = chip.dataset.key;
                    if (!key) return;

                    this.state.initialized = true;

                    if (this.state.selectedFeatures.has(key)) {
                        this.state.selectedFeatures.delete(key);
                        chip.classList.remove('selected');
                    } else {
                        this.state.selectedFeatures.add(key);
                        chip.classList.add('selected');
                    }
                    this.calculate();
                });
            });
        },

        initBriefForm() {
            const sendBtn = document.getElementById('quoteSendBriefBtn');
            if (!sendBtn) return;

            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitBrief();
            });
        },

        calculate() {
            const priceValEl = document.getElementById('quotePriceVal');
            const summaryFeaturesEl = document.getElementById('summaryFeaturesCount');

            const summaryTypeEl = document.getElementById('summaryProjectType');
            const summaryDesignEl = document.getElementById('summaryDesignLevel');
            const summaryPagesEl = document.getElementById('summaryPages');
            const summaryDaysEl = document.getElementById('summaryDeliveryDays');
            const summaryComplexityEl = document.getElementById('summaryComplexity');

            if (!this.state.initialized && this.state.selectedFeatures.size === 0) {
                if (priceValEl) priceValEl.textContent = '0 ₺';
                if (summaryTypeEl) summaryTypeEl.textContent = this.state.projectTypeName;
                if (summaryDesignEl) summaryDesignEl.textContent = this.state.designLevelName;
                if (summaryPagesEl) summaryPagesEl.textContent = this.state.pageCount + ' Sayfa';
                if (summaryFeaturesEl) summaryFeaturesEl.textContent = '0 Seçili Modül';
                if (summaryDaysEl) summaryDaysEl.textContent = '14–18 İş Günü';
                if (summaryComplexityEl) summaryComplexityEl.textContent = 'Seçim Bekleniyor';
                this.calculatedData = { minBudget: 0, maxBudget: 0, totalDays: 0, complexity: 'Seçim Bekleniyor', selectedList: [] };
                return;
            }

            // 1. Temel Proje Fiyatı
            const basePrice = this.prices.base[this.state.projectType] || 14500;

            // 2. Tasarım Çarpanı
            const multiplier = this.prices.designMultiplier[this.state.designLevel] || 1.25;
            let subtotal = basePrice * multiplier;

            // 3. Sayfa Sayısı Farkı (Temel 5 sayfa dahildir)
            if (this.state.pageCount > 5) {
                const extra = this.state.pageCount - 5;
                subtotal += extra * 1250;
            }

            // 4. Seçilen Ek Özellikler
            let totalDays = 10;
            const selectedList = [];

            this.state.selectedFeatures.forEach((key) => {
                const feat = this.prices.features[key];
                if (feat) {
                    subtotal += feat.price;
                    totalDays += feat.days;
                    selectedList.push(feat.name);
                }
            });

            // Ek sayfa süresi
            totalDays += Math.round(this.state.pageCount * 0.4);

            // Bütçe Aralığı
            const minBudget = Math.round((subtotal * 0.94) / 100) * 100;
            const maxBudget = Math.round((subtotal * 1.12) / 100) * 100;

            // Karmaşıklık Değerlendirmesi
            let complexity = 'Orta';
            if (subtotal > 35000 || this.state.selectedFeatures.size > 8) {
                complexity = 'Kurumsal İleri Seviye';
            } else if (subtotal > 20000 || this.state.selectedFeatures.size > 4) {
                complexity = 'Orta - Yüksek';
            }

            // UI Güncelle
            if (priceValEl) {
                priceValEl.textContent = minBudget.toLocaleString('tr-TR') + ' ₺ — ' + maxBudget.toLocaleString('tr-TR') + ' ₺';
            }
            if (summaryTypeEl) summaryTypeEl.textContent = this.state.projectTypeName;
            if (summaryDesignEl) summaryDesignEl.textContent = this.state.designLevelName;
            if (summaryPagesEl) summaryPagesEl.textContent = this.state.pageCount + ' Sayfa';
            if (summaryFeaturesEl) summaryFeaturesEl.textContent = this.state.selectedFeatures.size + ' Seçili Modül';
            if (summaryDaysEl) summaryDaysEl.textContent = `${totalDays}–${totalDays + 4} İş Günü`;
            if (summaryComplexityEl) summaryComplexityEl.textContent = complexity;

            this.calculatedData = {
                minBudget,
                maxBudget,
                totalDays,
                complexity,
                selectedList
            };
        },

        submitBrief() {
            const name = document.getElementById('briefClientName')?.value || '';
            const company = document.getElementById('briefClientCompany')?.value || '';
            const email = document.getElementById('briefClientEmail')?.value || '';
            const phone = document.getElementById('briefClientPhone')?.value || '';
            const notes = document.getElementById('briefClientNotes')?.value || '';

            if (!name || !email) {
                alert('Lütfen en azından Ad Soyad ve E-Posta alanlarını doldurunuz.');
                return;
            }

            const data = this.calculatedData || {};
            const subject = `EroCore Proje Brief & Teklif Talebi — ${company || name}`;

            const bodyLines = [
                `=== EROCORE WEB STUDIO PROJE TEKLİF BRİEFİ ===`,
                ``,
                `1. MÜŞTERİ BİLGİLERİ:`,
                `Ad Soyad: ${name}`,
                `Firma / Marka: ${company || 'Belirtilmedi'}`,
                `E-Posta: ${email}`,
                `Telefon: ${phone || 'Belirtilmedi'}`,
                ``,
                `2. PROJE KONFİGÜRASYONU:`,
                `Proje Türü: ${this.state.projectTypeName}`,
                `Tasarım Seviyesi: ${this.state.designLevelName}`,
                `Sayfa Sayısı: ${this.state.pageCount} Sayfa`,
                `Tahmini Bütçe Aralığı: ${data.minBudget?.toLocaleString('tr-TR')} ₺ — ${data.maxBudget?.toLocaleString('tr-TR')} ₺`,
                `Tahmini Teslimat Süresi: ${data.totalDays}–${data.totalDays + 4} İş Günü`,
                `Proje Karmaşıklığı: ${data.complexity}`,
                ``,
                `3. SEÇİLEN MODÜLLER VE ÖZELLİKLER (${this.state.selectedFeatures.size} Adet):`,
                data.selectedList && data.selectedList.length ? data.selectedList.map(s => '• ' + s).join('\n') : 'Standart Temel Özellikler',
                ``,
                `4. MÜŞTERİ NOTLARI & PROJE DETAYI:`,
                notes || 'Ekstra not iletilmedi.'
            ];

            const mailtoUrl = `mailto:mehmeteroglu911@outlook.com.tr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
            window.location.href = mailtoUrl;

            alert('Resmi proje briefiniz oluşturuldu! E-posta istemciniz üzerinden mehmeteroglu911@outlook.com.tr adresine aktarılıyor.');
        }
    };

    /* ============================================================
       08 · LEGACY KALİBRASYON / STATİK HESAPLAYICI (OLD CALC)
       ============================================================ */
    const LegacyCalculator = {
        base: 11400,
        pageBase: 1500,
        addons: {
            threeD: 9000,
            ecommerce: 16000,
            booking: 11000,
            maintenance: 2500
        },

        init() {
            const slider = document.getElementById('calcPageSlider');
            const display = document.getElementById('calcPageDisplay');
            const total = document.getElementById('calcTotalPrice');
            const button = document.getElementById('calcApplyBtn');
            const checks = document.querySelectorAll('.calc-addon-check');

            if (!slider || !display || !total) return;

            const update = () => {
                const pageCount = Number(slider.value || 5);
                let sum = this.base;
                if (pageCount > 5) sum += (pageCount - 5) * this.pageBase;

                checks.forEach((checkbox) => {
                    if (checkbox.checked) {
                        sum += this.addons[checkbox.dataset.addon] || 0;
                    }
                });

                display.textContent = `${pageCount} Sayfa`;
                total.textContent = `${sum.toLocaleString('tr-TR')} ₺`;
            };

            slider.addEventListener('input', update);
            checks.forEach((checkbox) => checkbox.addEventListener('change', update));

            if (button) {
                button.addEventListener('click', () => {
                    const target = document.getElementById('iletisim');
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            }

            update();
        }
    };

    /* ============================================================
       09 · UI ETKİLEŞİMLERİ (Nav, Drawer, SSS, Scroll Bar)
       ============================================================ */
    const UI = {
        init() {
            this.initNavbar();
            this.initProgressBar();
            this.initFaq();
            this.initSmoothScroll();
            this.initForm();
            this.initMouseTrack();
            this.initGsap();
        },

        initNavbar() {
            const navbar = document.getElementById('navbar');
            const toggle = document.getElementById('navToggle');
            const drawer = document.getElementById('mobileDrawer');

            window.addEventListener('scroll', () => {
                if (window.scrollY > 40) {
                    navbar?.classList.add('scrolled');
                } else {
                    navbar?.classList.remove('scrolled');
                }
            }, { passive: true });

            if (toggle && drawer) {
                toggle.addEventListener('click', () => {
                    drawer.classList.toggle('open');
                    toggle.textContent = drawer.classList.contains('open') ? '✕' : '☰';
                });

                drawer.querySelectorAll('.mobile-drawer-link').forEach((link) => {
                    link.addEventListener('click', () => {
                        drawer.classList.remove('open');
                        toggle.textContent = '☰';
                    });
                });
            }
        },

        initProgressBar() {
            const bar = document.getElementById('scrollProgressBar');
            if (!bar) return;

            window.addEventListener('scroll', () => {
                const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
                if (totalHeight > 0) {
                    const percent = (window.scrollY / totalHeight) * 100;
                    bar.style.width = Math.min(100, Math.max(0, percent)) + '%';
                }
            }, { passive: true });
        },

        initFaq() {
            const items = document.querySelectorAll('.faq-item');
            items.forEach((item) => {
                const question = item.querySelector('.faq-question');
                if (question) {
                    question.addEventListener('click', () => {
                        const isOpen = item.classList.contains('active');
                        items.forEach((other) => other.classList.remove('active'));
                        if (!isOpen) {
                            item.classList.add('active');
                        }
                    });
                }
            });
        },

        initSmoothScroll() {
            document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
                anchor.addEventListener('click', function (e) {
                    const href = this.getAttribute('href');
                    if (href === '#' || !href) return;

                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        const navHeight = 76;
                        const top = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                        window.scrollTo({ top, behavior: 'smooth' });
                    }
                });
            });
        },

        initForm() {
            const form = document.getElementById('contactForm');
            if (!form) return;

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = form.querySelector('[name="name"]')?.value || '';
                const email = form.querySelector('[name="email"]')?.value || '';
                const category = form.querySelector('[name="category"]')?.value || 'Teklif / Proje Görüşmesi';
                const pkg = form.querySelector('[name="package"]')?.value || '';
                const message = form.querySelector('[name="message"]')?.value || '';

                if (!name || !email) {
                    alert('Lütfen adınızı ve e-posta adresinizi doldurunuz.');
                    return;
                }

                const mailtoUrl = `mailto:mehmeteroglu911@outlook.com.tr?subject=${encodeURIComponent(`EroCore Web Studio - ${category} - ${name}`)}&body=${encodeURIComponent(
                    `İsim / Firma: ${name}\nE-posta: ${email}\nİletişim Kategorisi: ${category}\nPaket Tercihi: ${pkg || 'Seçilmedi'}\n\nMesaj / Sorunuz:\n${message}`
                )}`;

                window.location.href = mailtoUrl;

                alert('Talebiniz kaydedildi! E-posta istemciniz açılmaktadır. Mehmet Eroğlu (mehmeteroglu911@outlook.com.tr) en kısa sürede dönüş yapacaktır.');
            });
        },

        initMouseTrack() {
            window.addEventListener('mousemove', (e) => {
                State.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
                State.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
            }, { passive: true });

            if (window.DeviceOrientationEvent) {
                window.addEventListener('deviceorientation', (e) => {
                    if (e.gamma !== null && e.beta !== null) {
                        State.mouse.targetX = (e.gamma / 90) * 0.8;
                        State.mouse.targetY = (e.beta / 180) * 0.6;
                    }
                }, { passive: true });
            }
        },

        initGsap() {
            if (!window.gsap || !window.ScrollTrigger) return;
            gsap.registerPlugin(ScrollTrigger);

            gsap.utils.toArray('.section-header').forEach((el) => {
                gsap.fromTo(el,
                    { opacity: 0, y: 35 },
                    {
                        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
                        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
                    }
                );
            });

            gsap.utils.toArray('.grid-2, .grid-3, .about-grid, .tools-grid, .pricing-deck, .timeline').forEach((grid) => {
                const children = grid.children;
                if (children.length > 0) {
                    gsap.fromTo(children,
                        { opacity: 0, y: 30 },
                        {
                            opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out',
                            scrollTrigger: { trigger: grid, start: 'top 88%', toggleActions: 'play none none none' }
                        }
                    );
                }
            });

            gsap.utils.toArray('.table-wrapper, .calc-widget').forEach((box) => {
                gsap.fromTo(box,
                    { opacity: 0, y: 30 },
                    {
                        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
                        scrollTrigger: { trigger: box, start: 'top 90%', toggleActions: 'play none none none' }
                    }
                );
            });
        }
    };

    /* ============================================================
       09 · MASTER BAŞLATICI
       ============================================================ */
    function init() {
        Device.init();
        ThreeScene.init();
        animate();
        Splash.init();
        Notification.init();
        QuoteEngine.init();
        LegacyCalculator.init();
        UI.init();

        window.addEventListener('resize', () => {
            Device.init();
            ThreeScene.onResize();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
/* ============================================================
   KVKK ÇEREZ BİLDİRİMİ — Tercih Yönetimi
   ============================================================ */
(function() {
    'use strict';

    const STORAGE_KEY = 'erocore_cookie_consent';
    const CONSENT_VERSION = '1.0';

    const banner = document.getElementById('cookieBanner');
    const acceptBtn = document.getElementById('cookieAcceptAll');
    const rejectBtn = document.getElementById('cookieRejectAll');
    const settingsBtn = document.getElementById('cookieSettingsBtn');

    if (!banner) return;

    // Kayıtlı tercihi kontrol et
    function getConsent() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            // Versiyon değişmişse yeniden sor
            if (data.version !== CONSENT_VERSION) return null;
            return data;
        } catch (e) {
            return null;
        }
    }

    // Tercihi kaydet
    function saveConsent(choice) {
        const data = {
            version: CONSENT_VERSION,
            choice: choice, // 'all' | 'essential'
            timestamp: new Date().toISOString()
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Cookie consent kaydedilemedi:', e);
        }

        // Google Analytics'e Consent Mode sinyali gönder
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'analytics_storage': choice === 'all' ? 'granted' : 'denied',
                'ad_storage': choice === 'all' ? 'granted' : 'denied',
                'ad_user_data': choice === 'all' ? 'granted' : 'denied',
                'ad_personalization': choice === 'all' ? 'granted' : 'denied'
            });
        }
    }

    // Banner'ı göster
    function showBanner() {
        banner.classList.add('show');
        settingsBtn.classList.remove('show');
    }

    // Banner'ı gizle
    function hideBanner() {
        banner.classList.remove('show');
        setTimeout(() => {
            settingsBtn.classList.add('show');
        }, 500);
    }

    // Başlangıç kontrolü
    const existing = getConsent();
    if (existing) {
        settingsBtn.classList.add('show');
        // GA consent mode update
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'analytics_storage': existing.choice === 'all' ? 'granted' : 'denied',
                'ad_storage': existing.choice === 'all' ? 'granted' : 'denied'
            });
        }
    } else {
        // İlk ziyaret: yarım saniye gecikmeyle göster (sayfa yüklenmesi bozulmasın)
        setTimeout(showBanner, 800);
    }

    // Tümünü Kabul Et
    acceptBtn.addEventListener('click', function() {
        saveConsent('all');
        hideBanner();
    });

    // Sadece Zorunlu
    rejectBtn.addEventListener('click', function() {
        saveConsent('essential');
        hideBanner();
    });

    // Ayarlar butonuna tıklanınca banner'ı tekrar göster
    settingsBtn.addEventListener('click', function() {
        showBanner();
    });
})();
