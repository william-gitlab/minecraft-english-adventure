import * as THREE from 'three';
import type {Vocabulary} from './learning';

const cube = new THREE.BoxGeometry(1,1,1);
const materials = new Map<string, THREE.MeshLambertMaterial>();
function material(color:string) {
  if (!materials.has(color)) materials.set(color,new THREE.MeshLambertMaterial({color}));
  return materials.get(color)!;
}
function box(group:THREE.Object3D, color:string, x:number,y:number,z:number, sx=1,sy=1,sz=1) {
  const mesh = new THREE.Mesh(cube,material(color));
  mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); group.add(mesh); return mesh;
}
export function resourceModel(v:Vocabulary):THREE.Group {
  const g = new THREE.Group(); const color = v.color;
  switch(v.model) {
    case 'wood':
      box(g,color,0,0,0,.85,.65,.62); box(g,'#cfa36b',.44,0,0,.035,.53,.52); box(g,'#895533',.465,0,0,.02,.22,.22);
      box(g,'#754a33',0,.13,.33,.85,.07,.025); break;
    case 'stone':
      box(g,color,0,-.06,0,.78,.58,.68); box(g,'#b7c3c6',-.08,.25,0,.53,.18,.45); box(g,'#6f818b',.4,-.12,.09,.16,.3,.38); break;
    case 'dirt': case 'sand': case 'grass':
      box(g,v.model === 'grass' ? '#a87953' : color,0,0,0,.72,.65,.72);
      box(g,v.model === 'grass' ? '#89c15c' : v.model === 'sand' ? '#f3dea6' : '#af8058',0,.34,0,.74,.13,.74);
      box(g,v.model === 'grass' ? '#b5d979' : '#c49b6b',-.16,-.04,.365,.12,.1,.02); break;
    case 'iron': case 'gold':
      box(g,color,0,-.12,0,.92,.26,.56); box(g,v.model === 'gold' ? '#ffdf77' : '#c3d5dd',0,.08,0,.73,.2,.43); break;
    case 'diamond': {
      const diamond = box(g,color,0,0,0,.54,.54,.54); diamond.rotation.z = Math.PI/4; diamond.rotation.y = Math.PI/4;
      box(g,'#d3ffff',-.12,.17,.22,.12,.16,.04); break;
    }
    case 'apple':
      box(g,color,0,0,0,.64,.57,.59); box(g,'#f49d7c',-.14,.07,.3,.14,.18,.035);
      box(g,'#735238',0,.37,0,.08,.2,.08); const leaf=box(g,'#7bad58',.15,.38,0,.3,.09,.18); leaf.rotation.z=.3; break;
    case 'sword':
      box(g,color,0,.23,0,.16,.75,.12); box(g,'#dbedf0',-.05,.24,.08,.06,.7,.035);
      box(g,'#e9bb58',0,-.21,0,.52,.13,.19); box(g,'#8a6043',0,-.43,0,.13,.32,.13); break;
    default: box(g,color,0,0,0,.7,.7,.7);
  }
  return g;
}
interface ResourceNode {v:Vocabulary; group:THREE.Group; marker:THREE.Mesh; cooldown:number}
export class World {
  renderer:THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-16,16,11,-11,.1,100);
  player = new THREE.Group();
  resources: ResourceNode[] = [];
  house = new THREE.Group();
  extras = new THREE.Group();
  gate = new THREE.Group();
  private staticGroup = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private playerPosition = new THREE.Vector3(0,0,4.2);
  private trees: [number,number][] = [];
  private time=0;
  private lastStage=-1;
  private unlocked=false;
  private previewModel?:THREE.Group;
  private previewScene=new THREE.Scene();
  private previewCamera=new THREE.PerspectiveCamera(35,1,.1,20);
  private leftLeg!:THREE.Mesh;
  private rightLeg!:THREE.Mesh;
  private banner:THREE.Sprite;
  onPick: (id:string)=>void = ()=>{};
  canvas:HTMLCanvasElement;
  constructor(container:HTMLElement, vocabulary:Vocabulary[]) {
    this.renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.setClearColor('#c6e0de');
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement; this.canvas.id='world'; this.canvas.setAttribute('aria-label','Interactive 3D forest. Use arrow keys or the touch joystick to move. Tap glowing resources to spell.');
    container.appendChild(this.canvas);
    this.scene.fog=new THREE.Fog('#c6e0de',38,68);
    this.scene.add(new THREE.HemisphereLight('#fffae4','#95ae8b',2.6));
    const sun=new THREE.DirectionalLight('#fff0d6',2.8); sun.position.set(-10,20,8); this.scene.add(sun);
    this.scene.add(this.staticGroup,this.player,this.house,this.extras,this.gate);
    this.terrain(); this.decorations(); this.character();
    vocabulary.forEach(v=>this.addResource(v));
    this.banner=this.makeLabel('YOUR LITTLE HOME', '#fff8e8', '#6c7253');
    this.banner.position.set(0,2.8,-2.5); this.banner.scale.set(3.5,.62,1); this.scene.add(this.banner);
    this.batchStatic();
    this.previewScene.add(new THREE.HemisphereLight('#fff6e0','#77968a',3));
    const light=new THREE.DirectionalLight('#ffffff',3); light.position.set(3,5,3); this.previewScene.add(light);
    this.previewCamera.position.set(1.8,1.1,2.5); this.previewCamera.lookAt(0,0,0);
    this.resize(); this.setHouse(0);
    let press={x:0,y:0};
    this.canvas.addEventListener('pointerdown',e=>{press={x:e.clientX,y:e.clientY};});
    this.canvas.addEventListener('pointerup',e=>{
      if (Math.hypot(e.clientX-press.x,e.clientY-press.y)>16) return;
      const rect=this.canvas.getBoundingClientRect();
      this.raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),this.camera);
      const hits=this.raycaster.intersectObjects(this.resources.filter(r=>r.cooldown<=Date.now()).map(r=>r.group),true);
      if(hits[0]) { let obj:THREE.Object3D|null=hits[0].object; while(obj && !obj.userData.resource) obj=obj.parent; if(obj) this.onPick(obj.userData.resource); }
    });
    window.addEventListener('resize',()=>this.resize());
  }
  private terrain() {
    const grass=['#92bc6d','#8eb568','#97c374','#a0c67d','#8fb66b'];
    for(let x=-11;x<=18;x++) for(let z=-10;z<=10;z++) {
      const meadow=x>10;
      const pond=x>=3&&x<=8&&z<=-7;
      const path=(Math.abs(x)<1.5&&z>-7&&z<8)||(z>=1&&z<=2&&x>=-9&&x<=10);
      const shade=grass[Math.abs((x*31+z*17)%grass.length)];
      box(this.staticGroup,pond?'#8fced4':path?'#d9c89c':meadow?'#afd187':shade,x,-.16,z,1,.32,1);
      if(x===-11 || x===18 || z===-10 || z===10) {
        box(this.staticGroup,'#b4936c',x,-.65,z,1,.68,1);
        box(this.staticGroup,'#886f54',x,-1.2,z,1,.43,1);
      }
    }
    // A little stepping-stone trail, wooden footbridge, and fences.
    for(let z=-6;z<8;z+=1.5) box(this.staticGroup,'#e7d7ae',.08,-.005,z,.8,.05,.48);
    for(let x=3;x<=8;x++) box(this.staticGroup,'#b98a5e',x,.1,-7.1,.87,.14,1.1);
    for(const x of [3,8]) for(const z of [-7.7,-6.5]) box(this.staticGroup,'#8d684b',x,.57,z,.12,1,.12);
    for(const z of [-7.7,-6.5]) box(this.staticGroup,'#d1a273',5.5,.86,z,5.1,.1,.1);
    for(let z=-9;z<=9;z+=2) {
      if(Math.abs(z)<2) continue;
      box(this.staticGroup,'#b18a60',10.3,.5,z,.15,1,.15);
      box(this.staticGroup,'#d4b081',10.3,.55,z,.1,.12,2);
      box(this.staticGroup,'#d4b081',10.3,.25,z,.1,.12,2);
    }
    for(const z of [-1.6,1.6]) box(this.gate,'#c5996e',10.3,.6,z,.22,1.2,.22);
    box(this.gate,'#d4b081',10.3,.65,0,.14,.17,3.2);
    box(this.gate,'#d4b081',10.3,.3,0,.14,.17,3.2);
    const label=this.makeLabel('SUNSHINE MEADOW  ·  BUILD TO UNLOCK','#fff8e8','#71804d');
    label.position.set(12.2,2.8,0); label.scale.set(4.5,.54,1); this.gate.add(label);
  }
  private tree(x:number,z:number,height=2.9,pine=false) {
    this.trees.push([x,z]);
    box(this.staticGroup,'#936949',x,height*.37,z,.38,height*.74,.38);
    box(this.staticGroup,'#af8055',x-.1,height*.35,z+.2,.13,height*.64,.025);
    if(pine) {
      [1.7,1.35,.95,.55].forEach((s,i)=>box(this.staticGroup,i%2?'#76a267':'#68945c',x,height*.55+i*.5,z,s,.65,s));
    } else {
      box(this.staticGroup,'#759d59',x,height*.8,z,1.9,1.05,1.7);
      box(this.staticGroup,'#91b76e',x-.15,height*1.04,z-.06,1.45,.65,1.3);
      box(this.staticGroup,'#a5c581',x-.37,height*1.1,z+.23,.65,.48,.8);
      box(this.staticGroup,'#84ac62',x+.5,height*.79,z+.35,.9,.7,.9);
    }
  }
  private decorations() {
    [[-9,-8,3.2],[-6,-8,3.1],[-3,-9,2.8],[-10,-4,3.3],[-8,0,3],[-9,5,3.4],[-6,8,2.8],[-3,8,2.7],[3,9,3],[8,8,2.8],[9,-3,3.2],[1,-9,2.7],[13,-7,3.2],[16,6,3.1],[17,-4,3.3]].forEach(([x,z,h],i)=>this.tree(x,z,h,i%4===0));
    // A friendly ranger's cabin.
    for(let y=.3;y<2;y+=.33) box(this.staticGroup,y%2?'#b68a62':'#bd9369',-6,y,-3.3,2.35,.3,2.2);
    for(let i=0;i<5;i++) box(this.staticGroup,i%2?'#ba7557':'#c98261',-6,2.1+i*.22,-3.3,2.7-i*.48,.24,2.7);
    box(this.staticGroup,'#70553e',-5.95,.75,-2.17,.62,1.5,.09);
    box(this.staticGroup,'#9fd4d3',-6.74,1.1,-2.16,.44,.54,.1);
    box(this.staticGroup,'#e7c99b',-6.74,1.1,-2.1,.05,.59,.025);
    box(this.staticGroup,'#e7c99b',-6.74,1.1,-2.1,.49,.05,.025);
    box(this.staticGroup,'#e2be86',-5.72,.78,-2.1,.055,.055,.055);
    // Flowers and small rocks distributed deterministically.
    for(let i=0;i<70;i++) {
      const x=((i*7.13)%28)-10; const z=((i*3.79)%18)-9;
      if(Math.abs(x)<2.2||Math.abs(z-1.5)<1.8||(x>2&&x<9&&z<-6)||(x>4&&x<9&&z>5)) continue;
      if(i%5===0) {box(this.staticGroup,'#9ba69c',x,.14,z,.32,.32,.38); continue;}
      box(this.staticGroup,'#6f984e',x,.16,z,.045,.32,.045);
      box(this.staticGroup,['#f4d784','#e9a493','#f3efca'][i%3],x,.34,z,.18,.12,.18);
    }
    for(let i=0;i<4;i++) box(this.staticGroup,'#98a8a4',-8+i*.45,.28+i*.15,-6,.8,.6,.7);
    // Small camp bench.
    box(this.staticGroup,'#b48e60',3,.42,5,1.8,.13,.55);
    for(const x of [2.3,3.7]) box(this.staticGroup,'#866344',x,.2,5,.13,.4,.46);
    // Meadow stepping stones lead to a new picnic area.
    for(let x=11;x<17;x++) box(this.staticGroup,'#dedbb8',x,.015,0,.6,.07,.65);
    box(this.staticGroup,'#dbad88',15,.04,2,2.2,.09,1.6);
    box(this.staticGroup,'#fff0ca',15,.11,2,.7,.2,.7);
    box(this.staticGroup,'#eb9176',15.4,.27,2.1,.25,.18,.25);
  }
  private character() {
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.48,16),new THREE.MeshBasicMaterial({color:'#4f704b',transparent:true,opacity:.22}));
    shadow.rotation.x=-Math.PI/2; shadow.position.y=.02; this.player.add(shadow);
    this.leftLeg=box(this.player,'#426878',-.14,.23,0,.2,.4,.23);
    this.rightLeg=box(this.player,'#426878',.14,.23,0,.2,.4,.23);
    box(this.player,'#f1bc64',0,.61,0,.52,.49,.31);
    box(this.player,'#eab898',0,1.07,0,.43,.43,.4);
    box(this.player,'#795240',0,1.29,-.015,.47,.13,.43);
    box(this.player,'#795240',0,1.13,-.2,.44,.32,.08);
    box(this.player,'#514940',-.105,1.09,.209,.055,.065,.02);
    box(this.player,'#514940',.105,1.09,.209,.055,.065,.02);
    box(this.player,'#e58f7b',0,.99,.21,.09,.03,.015);
    box(this.player,'#ecc5a0',-.35,.61,0,.15,.44,.22);
    box(this.player,'#ecc5a0',.35,.61,0,.15,.44,.22);
    box(this.player,'#b37650',0,.66,-.23,.35,.37,.18);
    box(this.player,'#edcf85',0,.65,-.33,.24,.19,.04);
    this.player.position.copy(this.playerPosition);
  }
  private makeLabel(text:string, background:string, color:string) {
    const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=96;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=background; ctx.beginPath(); ctx.roundRect(0,0,768,96,24); ctx.fill();
    ctx.fillStyle=color; ctx.font='bold 26px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,384,49);
    const texture=new THREE.CanvasTexture(canvas);
    return new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));
  }
  private batchStatic() {
    this.staticGroup.updateMatrixWorld(true);
    const batches=new Map<THREE.Material,THREE.Matrix4[]>();
    this.staticGroup.traverse(obj=>{if(obj instanceof THREE.Mesh && obj.geometry===cube){const m=obj.material as THREE.Material; const list=batches.get(m)||[]; list.push(obj.matrixWorld.clone()); batches.set(m,list);}});
    this.scene.remove(this.staticGroup);
    for(const [mat,matrices] of batches) {
      const batch=new THREE.InstancedMesh(cube,mat,matrices.length);
      matrices.forEach((m,i)=>batch.setMatrixAt(i,m)); batch.computeBoundingSphere(); this.scene.add(batch);
    }
  }
  private addResource(v:Vocabulary) {
    const g=new THREE.Group(); g.userData.resource=v.id;
    const model=resourceModel(v); g.add(model); g.position.set(v.position[0],.85,v.position[1]);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.61,.035,4,24),new THREE.MeshBasicMaterial({color:'#ffe8a1'}));
    ring.rotation.x=Math.PI/2; ring.position.y=-.74; g.add(ring);
    const sparkle=box(g,'#fff3bd',.45,.63,0,.1,.1,.1); sparkle.rotation.z=Math.PI/4;
    this.scene.add(g); this.resources.push({v,group:g,marker:ring,cooldown:0});
  }
  resize() {
    const width=window.innerWidth, height=window.innerHeight;
    this.renderer.setSize(width,height);
    const span=height<600 ? 10.5 : 11.7;
    this.camera.left=-span*width/height; this.camera.right=span*width/height;
    this.camera.top=span; this.camera.bottom=-span; this.camera.updateProjectionMatrix();
  }
  setHouse(stage:number) {
    if(stage===this.lastStage) return; this.lastStage=stage;
    this.house.clear(); this.house.position.set(0,0,-3.5); this.house.userData.build=true;
    if(stage===0) {
      for(const x of [-1.3,1.3]) for(const z of [-1.3,1.3]) box(this.house,'#cba76a',x,.23,z,.15,.48,.15);
      for(const z of [-1.3,1.3]) box(this.house,'#e3cca0',0,.3,z,2.6,.035,.035);
      for(const x of [-1.3,1.3]) box(this.house,'#e3cca0',x,.3,0,.035,.035,2.6);
    }
    if(stage>=1) {
      box(this.house,'#a2ada3',0,.15,0,2.8,.3,2.8);
      box(this.house,'#d4c2a0',0,.33,0,2.5,.1,2.5);
      for(let x=-1;x<=1;x+=.5) box(this.house,'#c1ad8a',x,.39,0,.45,.04,2.5);
    }
    if(stage>=2) {
      for(let y=.65;y<2;y+=.3) {
        box(this.house,'#c49668',-1.15,y,0,.25,.28,2.5); box(this.house,'#c49668',1.15,y,0,.25,.28,2.5);
        box(this.house,'#b6885c',0,y,-1.15,2.5,.28,.25);
        for(const x of [-.86,.86]) box(this.house,'#c49668',x,y,1.15,.7,.28,.25);
      }
      box(this.house,'#e9c89a',0,1.92,1.15,2.5,.22,.25);
      for(const x of [-.87,.87]) box(this.house,'#a4d7d7',x,1.38,1.29,.41,.4,.02);
    }
    if(stage>=3) {
      for(let i=0;i<6;i++) box(this.house,i%2?'#5e8992':'#709fa4',0,2.08+i*.23,0,3.1-i*.49,.26,3.1);
      box(this.house,'#886a4a',0,1.08,1.29,.62,1.4,.1);
      box(this.house,'#eace83',.2,1.08,1.36,.07,.07,.07);
      box(this.house,'#bf9270',.8,2.7,-.6,.35,.8,.35);
      this.unlocked=true; this.gate.visible=false; this.banner.visible=false;
    }
  }
  setExtras(ids:string[]) {
    this.extras.clear();
    if(ids.includes('wall')) for(let x=-2;x<=2;x+=.6) for(let y=.2;y<.9;y+=.35) box(this.extras,'#9ba89b',x,y,-6,.55,.32,.35);
    if(ids.includes('garden')) {
      box(this.extras,'#957154',3,.1,-4.5,1.8,.2,2.5);
      for(let z=-5.3;z<=-3.5;z+=.5) for(const x of [2.5,3,3.5]) {
        box(this.extras,'#82ae57',x,.3,z,.16,.3,.16); box(this.extras,'#f0b260',x,.49,z,.2,.12,.2);
      }
    }
  }
  harvest(id:string) { const r=this.resources.find(r=>r.v.id===id); if(r){r.cooldown=Date.now()+8000; r.group.visible=false;} }
  nearest():Vocabulary|undefined {
    const available=this.resources.filter(r=>r.cooldown<=Date.now()&&r.group.position.distanceTo(this.playerPosition)<2.5);
    available.sort((a,b)=>a.group.position.distanceTo(this.playerPosition)-b.group.position.distanceTo(this.playerPosition));
    return available[0]?.v;
  }
  highlight(id?:string) { for(const r of this.resources) r.marker.material=(id===r.v.id ? material('#ffffff') : material('#ffe8a1')); }
  get location() {return this.playerPosition.x>10?'Sunshine Meadow':'Little Forest';}
  setPreview(v?:Vocabulary) {
    if(this.previewModel) this.previewScene.remove(this.previewModel);
    this.previewModel=v?resourceModel(v):undefined;
    if(this.previewModel) {this.previewModel.scale.setScalar(1.5); this.previewScene.add(this.previewModel);}
  }
  update(delta:number, movement:{x:number;y:number}, active:boolean, previewRect?:DOMRect) {
    this.time+=delta;
    if(active) {
      const input=new THREE.Vector2(movement.x,movement.y); if(input.length()>1) input.normalize();
      // Screen-right and screen-up movement in an isometric view.
      const dx=(input.x*.8+input.y*.6)*3.8*delta, dz=(-input.x*.6+input.y*.8)*3.8*delta;
      const next=this.playerPosition.clone(); next.x+=dx; next.z+=dz;
      next.x=THREE.MathUtils.clamp(next.x,-10.4,this.unlocked?17.4:9.7); next.z=THREE.MathUtils.clamp(next.z,-9.4,9.4);
      const blocked=(x:number,z:number)=>this.trees.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<.63)||(x>2.5&&x<8.5&&z<-7.6)||(x>-7.35&&x<-4.65&&z>-4.6&&z<-2.1)||(this.lastStage>=2&&Math.abs(x)<1.5&&z<-2&&z>-5);
      if(!blocked(next.x,this.playerPosition.z)) this.playerPosition.x=next.x;
      if(!blocked(this.playerPosition.x,next.z)) this.playerPosition.z=next.z;
      if(input.length()>.05) {
        this.player.rotation.y=Math.atan2(dx,dz);
        this.leftLeg.rotation.x=Math.sin(this.time*12)*.45; this.rightLeg.rotation.x=-this.leftLeg.rotation.x;
      } else {this.leftLeg.rotation.x=0;this.rightLeg.rotation.x=0;}
      this.player.position.copy(this.playerPosition);
      this.canvas.dataset.playerPosition=`${this.playerPosition.x.toFixed(2)},${this.playerPosition.z.toFixed(2)}`;
    }
    this.resources.forEach((r,i)=>{
      r.group.visible=r.cooldown<=Date.now();
      r.group.position.y=.91+Math.sin(this.time*1.8+i)*.1;
      const model=r.group.children[0]; model.rotation.y=Math.sin(this.time*.5+i)*.2;
    });
    const target=new THREE.Vector3(1+this.playerPosition.x*.22,0,this.playerPosition.z*.18);
    this.camera.position.copy(target).add(new THREE.Vector3(18,21,24)); this.camera.lookAt(target);
    this.renderer.setScissorTest(false); this.renderer.setClearColor('#c6e0de');
    this.renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
    this.renderer.render(this.scene,this.camera);
    if(previewRect&&this.previewModel) {
      const {left,top,width,height}=previewRect;
      this.previewModel.rotation.y=this.time*.5;
      this.previewCamera.aspect=width/height;this.previewCamera.updateProjectionMatrix();
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(left,window.innerHeight-top-height,width,height);
      this.renderer.setViewport(left,window.innerHeight-top-height,width,height);
      this.renderer.setClearColor('#f0ead8'); this.renderer.render(this.previewScene,this.previewCamera);
      this.renderer.setScissorTest(false);
    }
  }
}
