/**
 * ============================================================
 * 建設DXツール - BIMビューア
 * ============================================================
 * Three.js + IFC.jsによる3Dモデル表示
 * ============================================================
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// IFCLoaderはThree.jsバージョン互換性問題のため一時的に無効化
// import { IFCLoader } from 'web-ifc-three/IFCLoader';

export class BIMViewer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        // this.ifcLoader = new IFCLoader();  // 一時的に無効化
        this.pins = [];  // ピンオブジェクト一覧
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // コールバック
        this.onClickPosition = null;  // 3Dクリック時のコールバック
    }

    init() {
        this.setupScene();
        this.setupLights();
        this.setupControls();
        this.setupClickHandler();
        this.loadModel();
        this.animate();

        window.addEventListener('resize', this.onResize.bind(this));
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfafafa); // Paper color

        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
    }

    /**
     * 3Dクリックイベントの設定
     */
    setupClickHandler() {
        this.renderer.domElement.addEventListener('dblclick', (event) => {
            // マウス座標を正規化
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // レイキャスト
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            if (intersects.length > 0) {
                // 最前面のオブジェクトを取得
                const firstHit = intersects[0];
                const object = firstHit.object;

                // ピンかどうか判定 (userDataにidがあるか確認、親も探索)
                let target = object;
                while (target && !target.userData.id && target.parent) {
                    target = target.parent;
                }

                if (target && target.userData.id) {
                    console.log("📌 ピン選択:", target.userData);
                    if (this.onClickPosition) {
                        this.onClickPosition({
                            type: 'pin',
                            data: target.userData,
                            screenPosition: { x: event.clientX, y: event.clientY }
                        });
                    }
                } else {
                    const point = firstHit.point;
                    console.log("📍 空間クリック:", point);
                    if (this.onClickPosition) {
                        this.onClickPosition({
                            type: 'space',
                            position: { x: point.x, y: point.y, z: point.z }
                        });
                    }
                }
            }
        });
    }

    async loadModel() {
        // IFCLoader は一時的に無効化（Three.jsバージョン互換性問題）
        // IFCファイルを読み込む場合は、互換性のあるバージョンに更新が必要
        // try {
        //     await this.ifcLoader.ifcManager.setWasmPath('../../node_modules/web-ifc/');
        // } catch (e) {
        //     console.warn("WASMパス設定エラー:", e.message);
        // }

        // モックビルディングを作成
        this.createMockBuilding();
    }

    createMockBuilding() {
        // Simple grid
        const gridHelper = new THREE.GridHelper(50, 50, 0xcccccc, 0xeeeeee);
        this.scene.add(gridHelper);

        // Concrete columns
        const colGeo = new THREE.BoxGeometry(1, 10, 1);
        const colMat = new THREE.MeshLambertMaterial({ color: 0x9E9E9E });

        const positions = [
            [-5, 5, -5], [5, 5, -5],
            [-5, 5, 5], [5, 5, 5]
        ];

        positions.forEach(pos => {
            const col = new THREE.Mesh(colGeo, colMat);
            col.position.set(...pos);
            this.scene.add(col);
        });

        // Slab
        const slabGeo = new THREE.BoxGeometry(12, 0.5, 12);
        const slab = new THREE.Mesh(slabGeo, colMat);
        slab.position.set(0, 10, 0);
        this.scene.add(slab);

        console.log("🏗️ モックビルディング作成完了");
    }

    /**
     * ピンを追加（古い互換性用）
     */
    addPin(priority) {
        const position = {
            x: (Math.random() - 0.5) * 10,
            y: 5 + Math.random() * 5,
            z: (Math.random() - 0.5) * 10
        };
        this.addPinFromData({
            id: 'temp-' + Date.now(),
            position,
            priority,
            title: ''
        });
    }

    /**
     * データからピンを追加
     */
    addPinFromData(data) {
        const { id, position, priority, title } = data;

        // 色の決定
        const colorMap = {
            high: 0xD32F2F,     // 赤
            medium: 0xFBC02D,   // 黄
            low: 0x2962FF       // 青
        };
        const pinColor = colorMap[priority] || colorMap.medium;

        // ピンヘッド
        const geo = new THREE.SphereGeometry(0.5, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: pinColor });
        const pin = new THREE.Mesh(geo, mat);

        pin.position.set(position.x, position.y, position.z);
        pin.userData = { id, title, priority };

        this.scene.add(pin);
        this.pins.push(pin);

        // ピンの針
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, -2, 0)
        ]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x333333 }));
        pin.add(line);

        console.log(`📌 ピン追加: ${title || id}`);
    }

    /**
     * カメラ状態を取得
     */
    getCameraState() {
        return {
            position: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            target: {
                x: this.controls.target.x,
                y: this.controls.target.y,
                z: this.controls.target.z
            }
        };
    }

    /**
     * カメラ位置を設定
     */
    setCameraPosition(position, target) {
        // アニメーション付きで移動
        const duration = 1000; // 1秒
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const endPos = new THREE.Vector3(position.x, position.y, position.z);
        const endTarget = new THREE.Vector3(target.x, target.y, target.z);

        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // イージング（ease-out）
            const eased = 1 - Math.pow(1 - t, 3);

            this.camera.position.lerpVectors(startPos, endPos, eased);
            this.controls.target.lerpVectors(startTarget, endTarget, eased);

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    onResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

