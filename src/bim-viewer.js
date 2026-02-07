/**
 * ============================================================
 * 建設DXツール - BIMビューア
 * ============================================================
 * Three.js + IFC.jsによる3Dモデル表示
 * ============================================================
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AxisLabels } from './axis-labels.js'; // Phase 3 (P1): I-V-7/I-V-8
// IFCLoaderはThree.jsバージョン互換性問題のため一時的に無効化
// import { IFCLoader } from 'web-ifc-three/IFCLoader';

export class BIMViewer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.axisLabels = null; // Phase 3 (P1): 3D軸ラベル・目盛り
        // this.ifcLoader = new IFCLoader();  // 一時的に無効化
        this.pins = [];  // ピンオブジェクト一覧
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // コールバック
        this.onClickPosition = null;  // 3Dクリック時のコールバック

        // ドラッグ操作用の状態変数
        this.isDragging = false;
        this.draggedPin = null;
        this.dragPlane = new THREE.Plane();
        this.dragOffset = new THREE.Vector3();

        // イベントハンドラのバインド（削除できるように）
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
    }

    init() {
        this.setupScene();
        this.setupLights();
        this.setupControls();
        this.setupAxisLabels(); // Phase 3 (P1)
        this.setupClickHandler();
        this.setupDragHandler(); // ドラッグハンドラ設定を追加
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
        this.camera.position.set(40, 30, 40); // より遠くから全体を見渡せる位置に変更
        this.camera.lookAt(0, 10, 0); // 建物の中心付近を見る

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // XY平面グリッド表示 (design_spec.md v6.1 §4.1, research.md v5.1 §5.2)
        const gridHelper = new THREE.GridHelper(100, 50, 0x888888, 0xcccccc);
        this.scene.add(gridHelper);

        // 原点マーカー (赤い球体)
        const originGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const originMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const originMarker = new THREE.Mesh(originGeometry, originMaterial);
        originMarker.position.set(0, 0, 0);
        this.scene.add(originMarker);
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
     * 3D軸ラベル・目盛りの初期化 (Phase 3: P1)
     */
    setupAxisLabels() {
        if (this.scene && this.container && this.camera) {
            this.axisLabels = new AxisLabels(this.scene, this.container, this.camera);
        }
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

    /**
     * ドラッグ操作のイベントリスナーを設定
     */
    setupDragHandler() {
        const domElement = this.renderer.domElement;
        // Pointer events for better support
        domElement.addEventListener('pointerdown', this.onPointerDown);
        domElement.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
    }

    onPointerDown(event) {
        // 左クリックのみ
        if (event.button !== 0) return;

        event.preventDefault();

        // マウス座標更新
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // ピンとの交差判定
        const intersects = this.raycaster.intersectObjects(this.pins, false);

        if (intersects.length > 0) {
            // ドラッグ開始
            this.isDragging = true;
            this.controls.enabled = false; // OrbitControlsを一時無効化
            this.draggedPin = intersects[0].object;

            // ドラッグ平面を設定（ピンの現在のY座標を持つ水平面）
            // カメラ方向に向けるビルボード平面の方が操作しやすい場合もあるが、建設では床面移動が直感的
            const pinPos = this.draggedPin.position;
            this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), pinPos);

            // インタラクション点とオブジェクト中心のオフセットを計算
            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragOffset)) {
                this.dragOffset.sub(pinPos);
            }
        }
    }

    onPointerMove(event) {
        if (!this.isDragging || !this.draggedPin) return;

        event.preventDefault();

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 平面との交点を計算して移動
        const intersectPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
            // オフセットを適用して、クリック位置とオブジェクトの相対位置を維持
            const newPos = intersectPoint.sub(this.dragOffset);
            this.draggedPin.position.copy(newPos);

            // データも更新（必要なら）
            if (this.draggedPin.userData.data) {
                this.draggedPin.userData.data.position = { x: newPos.x, y: newPos.y, z: newPos.z };
            }
        }
    }

    onPointerUp(event) {
        if (this.isDragging) {
            console.log("🛑 Drag End");
            this.isDragging = false;
            this.draggedPin = null;
            this.controls.enabled = true; // OrbitControlsを有効化
        }
    }

    async loadModel() {
        // IFCLoader は一時的に無効化（Three.jsバージョン互換性問題）
        // IFCファイルを読み込む場合は、互換性のあるバージョンに更新が必要
        // try {
        //     await this.ifcLoader.ifcManager.setWasmPath('../../node_modules/web-ifc/');\
        // } catch (e) {
        //     console.warn("WASMパス設定エラー:", e.message);
        // }

        // モックビルディングを作成 (Snowdon Towers)
        // 参照: test-folder/Snowdon Towers Sample Architectural.rvt (94.7MB)
        // RVTファイルは直接読み込めないため、Three.jsでエミュレーション
        this.createSnowdonMock();
        console.log("🏗️ [テスト] test-folder/Snowdon Towers Sample Architectural.rvt を読み込みました（Three.jsエミュレーション）");
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
     * サンプルモデルの読み込みシミュレーション
     * @param {string} fileName 
     */
    async loadSampleModel(fileName) {
        console.log(`🏗️ サンプルモデル読み込み開始: ${fileName}`);

        // 既存のメッシュを削除（グリッドとライト以外）
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const obj = this.scene.children[i];
            if (obj.type === 'Mesh' || obj.type === 'Group') {
                this.scene.remove(obj);
            }
        }
        this.pins = []; // ピンもリセット

        // グリッド再追加（消えていたら）
        if (!this.scene.children.find(c => c instanceof THREE.GridHelper)) {
            const gridHelper = new THREE.GridHelper(50, 50, 0xcccccc, 0xeeeeee);
            this.scene.add(gridHelper);
        }

        // Snowdon Towers 風のモック作成
        this.createSnowdonMock();
    }

    /**
     * "Snowdon Towers" 風のモックタワー作成
     */
    createSnowdonMock() {
        const matConcrete = new THREE.MeshLambertMaterial({ color: 0xEEEEEE });
        const matGlass = new THREE.MeshStandardMaterial({
            color: 0xAADDFF,
            transparent: true,
            opacity: 0.6,
            metalness: 0.1,
            roughness: 0.1
        });

        // タワーA: 高層
        const towerAGeo = new THREE.BoxGeometry(8, 30, 8);
        const towerA = new THREE.Mesh(towerAGeo, matGlass);
        towerA.position.set(-10, 15, -5);
        this.scene.add(towerA);

        // タワーA 骨組み
        const edgesA = new THREE.EdgesGeometry(towerAGeo);
        const lineA = new THREE.LineSegments(edgesA, new THREE.LineBasicMaterial({ color: 0x999999 }));
        lineA.position.copy(towerA.position);
        this.scene.add(lineA);

        // タワーB: 中層
        const towerBGeo = new THREE.BoxGeometry(12, 20, 10);
        const towerB = new THREE.Mesh(towerBGeo, matConcrete);
        towerB.position.set(5, 10, 5);
        this.scene.add(towerB);

        // 連結通路
        const bridgeGeo = new THREE.BoxGeometry(10, 2, 4);
        const bridge = new THREE.Mesh(bridgeGeo, matConcrete);
        bridge.position.set(-2, 10, 0);
        bridge.rotation.y = Math.PI / 4;
        this.scene.add(bridge);

        console.log("🏔️ Snowdon Towers (Mock) 作成完了");
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
     * データからピンを追加 (design_spec v3.1 §3.5対応)
     */
    addPinFromData(data) {
        const { id, position, priority, markup_type } = data;

        // ピン用のスプライトを作成
        const sprite = this.createIconSprite(markup_type, priority);
        if (sprite) {
            sprite.position.set(position.x, position.y, position.z);
            sprite.userData = { id, type: 'pin', data }; // クリック判定用データ
            this.scene.add(sprite);
            this.pins.push(sprite);
        }
    }

    /**
     * アイコンスプライトを作成
     * Canvasに絵文字を描画してテクスチャ化
     */
    createIconSprite(markupType, priority) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // 背景円を描画
        let bgColor = '#FFF59D'; // Default Yellow
        let borderColor = '#FBC02D';

        // 優先度やタイプに応じた色設定（必要に応じて調整）
        // ここではアイコンを目立たせるため、白背景＋枠線にする
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(64, 64, 60, 0, Math.PI * 2);
        ctx.fill();

        // 枠線
        ctx.strokeStyle = this.getBorderColor(markupType || 'stamp_memo');
        ctx.lineWidth = 6;
        ctx.stroke();

        // アイコン（絵文字）を描画
        const iconChar = this.getIconChar(markupType || 'stamp_memo');
        ctx.font = '80px "Not Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#333';
        ctx.fillText(iconChar, 64, 70); // 微調整

        // テクスチャ作成
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);

        // スケール調整（3D空間内でのサイズ）
        sprite.scale.set(3, 3, 1);

        return sprite;
    }

    getIconChar(type) {
        switch (type) {
            case 'stamp_check': return '✅';
            case 'stamp_question': return '❓';
            case 'stamp_alert': return '⚠️';
            case 'stamp_chat': return '💬';
            case 'stamp_star': return '⭐';
            case 'stamp_memo': return '📝';
            default: return '📍';
        }
    }

    getBorderColor(type) {
        switch (type) {
            case 'stamp_check': return '#4CAF50';
            case 'stamp_question': return '#FF4081'; // Pink
            case 'stamp_alert': return '#F44336';
            case 'stamp_chat': return '#2196F3';
            case 'stamp_star': return '#FFC107';
            case 'stamp_memo': return '#795548';
            default: return '#9E9E9E';
        }
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

        // 軸ラベルのリサイズ処理
        if (this.axisLabels) {
            this.axisLabels.onResize(this.container.clientWidth, this.container.clientHeight);
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);

        // 軸ラベルのレンダリング
        if (this.axisLabels) {
            this.axisLabels.render();
        }
    }

    /**
     * 測定モード開始 (簡易実装)
     * design_spec.md v6.1 §4.2 準拠 - mm単位表示
     */
    startMeasurementMode() {
        let measurePoints = [];
        let measureLine = null;
        let measureLabel = null;

        const measureClickHandler = (event) => {
            // マウス座標を正規化
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Raycasterで交点を取得
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            if (intersects.length > 0) {
                const point = intersects[0].point.clone();
                measurePoints.push(point);

                // 1点目：マーカー表示
                if (measurePoints.length === 1) {
                    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
                    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    const marker = new THREE.Mesh(geometry, material);
                    marker.position.copy(point);
                    marker.name = 'measureMarker';
                    this.scene.add(marker);

                    console.log('📏 1点目:', point);
                }

                // 2点目：距離計算と線表示
                if (measurePoints.length === 2) {
                    const start = measurePoints[0];
                    const end = measurePoints[1];
                    const distance = start.distanceTo(end);
                    const distanceMM = (distance * 1000).toFixed(1); // m→mm変換 (I-4: P1)

                    // 2点目のマーカー
                    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
                    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                    const marker = new THREE.Mesh(geometry, material);
                    marker.position.copy(end);
                    marker.name = 'measureMarker';
                    this.scene.add(marker);

                    // 線を描画
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
                    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
                    measureLine = new THREE.Line(lineGeometry, lineMaterial);
                    measureLine.name = 'measureLine';
                    this.scene.add(measureLine);

                    // 距離ラベル（mm単位）
                    console.log(`📏 距離: ${distanceMM} mm`);

                    // 通知 (design_spec.md §4.2: mm単位)
                    if (window.showNotification) {
                        window.showNotification(`📏 距離: ${distanceMM} mm`);
                    }

                    // 測定終了：イベントリスナー解除
                    this.container.removeEventListener('click', measureClickHandler);
                    measurePoints = [];

                    // 5秒後にマーカーと線を削除
                    setTimeout(() => {
                        this.scene.children.filter(obj => obj.name === 'measureMarker' || obj.name === 'measureLine')
                            .forEach(obj => this.scene.remove(obj));
                    }, 5000);
                }
            }
        };

        // クリックイベントに測定処理を登録
        this.container.addEventListener('click', measureClickHandler);
        console.log('📏 測定モード開始: 2点をクリックしてください');
    }
}

