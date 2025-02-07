// 1. 바닥 자동 인식을 위한 floor-detector 컴포넌트 (WebXR Hit Test API 활용)
AFRAME.registerComponent('floor-detector', {
    init: function () {
      this.hitTestSource = null;
      this.refSpace = null;
      this.viewerSpace = null;
      this.session = null;
      
      this.el.sceneEl.addEventListener('enter-vr', () => {
        this.session = this.el.sceneEl.renderer.xr.getSession();
        if (this.session && this.session.isImmersiveAr) {
          this.session.requestReferenceSpace('viewer').then((space) => {
            this.viewerSpace = space;
            return this.session.requestHitTestSource({ space: this.viewerSpace });
          }).then((source) => {
            this.hitTestSource = source;
          });
          this.session.requestReferenceSpace('local-floor').then((refSpace) => {
            this.refSpace = refSpace;
          });
        }
      });
      
      this.el.sceneEl.addEventListener('exit-vr', () => {
        this.hitTestSource = null;
        this.refSpace = null;
        this.viewerSpace = null;
        this.session = null;
      });
    },
    tick: function () {
      if (!this.hitTestSource || !this.session || !this.refSpace) { return; }
      const xrFrame = this.el.sceneEl.frame;
      if (!xrFrame) { return; }
      const hitTestResults = xrFrame.getHitTestResults(this.hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(this.refSpace);
        if (pose) {
          // 게임 루트 엔티티의 위치를 실제 바닥 위치로 업데이트
          this.el.object3D.position.set(
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z
          );
        }
      }
    }
  });
  
  // 2. 공 충돌 판정 및 효과 처리 (충돌 시 벽돌 제거)
  AFRAME.registerComponent('ball-collision', {
    init: function () {
      this.el.addEventListener('collide', (e) => {
        const collidedEl = e.detail.body.el;
        if (collidedEl && collidedEl.classList.contains('brick')) {
          collidedEl.parentNode.removeChild(collidedEl);
          console.log('Brick destroyed!');
        }
      });
    }
  });
  
  // 3. ball-launcher 컴포넌트: 물리 바디에 초기 속도 부여 (1초 후 실행)
  AFRAME.registerComponent('ball-launcher', {
    init: function () {
      setTimeout(() => {
        if (this.el.body) {
          this.el.body.velocity.set(0.5, 0.5, 0);
        }
      }, 1000);
    }
  });
  
  // 4. paddle-controller 컴포넌트: 오른손 컨트롤러의 트리거가 눌리면 컨트롤러의 x좌표를 발판에 반영
  AFRAME.registerComponent('paddle-controller', {
    schema: {
      controllerId: { default: '#right-controller' }
    },
    init: function () {
      this.controller = document.querySelector(this.data.controllerId);
    },
    tick: function () {
      if (!this.controller) { return; }
      const tracked = this.controller.components['tracked-controls'];
      if (!tracked || !tracked.controller) { return; }
      const gamepad = tracked.controller;
      // 버튼 0(트리거)이 눌린 상태일 때
      if (gamepad.buttons[0] && gamepad.buttons[0].pressed) {
        const controllerPos = new THREE.Vector3();
        this.controller.object3D.getWorldPosition(controllerPos);
        this.el.object3D.position.x = controllerPos.x;
        if (this.el.body) {
          this.el.body.position.x = controllerPos.x;
          this.el.body.velocity.x = 0;
        }
      }
    }
  });
  