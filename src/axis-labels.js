/**
 * 3D霆ｸ繝ｩ繝吶Ν繝ｻ逶ｮ逶帙ｊ陦ｨ遉ｺ讖溯・
 * Phase 3 (P1): I-V-7, I-V-8
 * 
 * CSS2DRenderer繧剃ｽｿ逕ｨ縺励※X/Y/Z霆ｸ縺ｫ繝ｩ繝吶Ν縺ｨ5m髢馴囈縺ｮ逶ｮ逶帙ｊ繧定｡ｨ遉ｺ
 */


import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export class AxisLabels {
    constructor(scene, container, camera) {
        this.scene = scene;
        this.container = container;
        this.camera = camera;

        // CSS2DRenderer繧貞・譛溷喧
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.labelRenderer.domElement.style.zIndex = '1';
        container.appendChild(this.labelRenderer.domElement);

        this.addAxisLabels();
        this.addAxisTicks();

        console.log('笨・3D霆ｸ繝ｩ繝吶Ν繝ｻ逶ｮ逶帙ｊ讖溯・繧貞・譛溷喧縺励∪縺励◆');
    }

    /**
     * 霆ｸ繝ｩ繝吶Ν繧剃ｽ懈・
     */
    createLabel(text, color) {
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = `
            font: bold 16px 'Inter', sans-serif;
            color: ${color};
            background: transparent;
            padding: 4px 10px;
            border-radius: 4px;
            border: 2px solid ${color};
            user-select: none;
        `;
        return new CSS2DObject(div);
    }

    /**
     * X/Y/Z霆ｸ繝ｩ繝吶Ν繧定ｿｽ蜉
     */
    addAxisLabels() {
        // X霆ｸ・郁ｵ､ #E53935・・
        const xLabel = this.createLabel('X霆ｸ', '#E53935');
        xLabel.position.set(55, 0, 0);
        this.scene.add(xLabel);

        // Y霆ｸ・育ｷ・#43A047 - 螂･陦後″・・
        const yLabel = this.createLabel('Y霆ｸ', '#43A047');
        yLabel.position.set(0, 0, 55);
        this.scene.add(yLabel);

        // Z霆ｸ・磯搨 #1E88E5 - 鬮倥＆・・
        const zLabel = this.createLabel('Z霆ｸ', '#1E88E5');
        zLabel.position.set(0, 55, 0);
        this.scene.add(zLabel);
    }

    /**
     * 霆ｸ逶ｮ逶帙ｊ繧剃ｽ懈・
     */
    createTickLabel(text, color) {
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = `
            font: 12px 'Inter', sans-serif;
            color: ${color};
            background: transparent;
            padding: 2px 6px;
            border-radius: 2px;
            user-select: none;
        `;
        return new CSS2DObject(div);
    }

    /**
     * 5m髢馴囈縺ｮ霆ｸ逶ｮ逶帙ｊ繧定ｿｽ蜉
     */
    addAxisTicks() {
        for (let i = 5; i <= 50; i += 5) {
            // X霆ｸ逶ｮ逶帙ｊ・郁ｵ､・・
            const xTick = this.createTickLabel(`${i}m`, '#E53935');
            xTick.position.set(i, -2, 0);
            this.scene.add(xTick);

            // Y霆ｸ逶ｮ逶帙ｊ・育ｷ・- 螂･陦後″・・
            const yTick = this.createTickLabel(`${i}m`, '#43A047');
            yTick.position.set(0, -2, i);
            this.scene.add(yTick);

            // Z霆ｸ逶ｮ逶帙ｊ・磯搨 - 鬮倥＆・・
            const zTick = this.createTickLabel(`${i}m`, '#1E88E5');
            zTick.position.set(-2, i, 0);
            this.scene.add(zTick);

            // 逶ｮ逶帙ｊ邱壹ｂ霑ｽ蜉・医が繝励す繝ｧ繝ｳ・・
            this.addTickLine(i, 'x', 0xE53935);
            this.addTickLine(i, 'y', 0x43A047);
            this.addTickLine(i, 'z', 0x1E88E5);
        }
    }

    /**
     * 逶ｮ逶帙ｊ邱壹ｒ霑ｽ蜉
     */
    addTickLine(position, axis, color) {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: color, opacity: 0.3, transparent: true });

        let points = [];
        if (axis === 'x') {
            points.push(new THREE.Vector3(position, -0.5, 0));
            points.push(new THREE.Vector3(position, 0.5, 0));
        } else if (axis === 'y') {
            points.push(new THREE.Vector3(0, -0.5, position));
            points.push(new THREE.Vector3(0, 0.5, position));
        } else if (axis === 'z') {
            points.push(new THREE.Vector3(-0.5, position, 0));
            points.push(new THREE.Vector3(0.5, position, 0));
        }

        geometry.setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
    }

    /**
     * 繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ繝ｫ繝ｼ繝励〒蜻ｼ縺ｳ蜃ｺ縺・
     */
    render() {
        if (this.labelRenderer && this.camera) {
            this.labelRenderer.render(this.scene, this.camera);
        }
    }

    /**
     * 繝ｪ繧ｵ繧､繧ｺ蜃ｦ逅・
     */
    onResize(width, height) {
        if (this.labelRenderer) {
            this.labelRenderer.setSize(width, height);
        }
    }
}
