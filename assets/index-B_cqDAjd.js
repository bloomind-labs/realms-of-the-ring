import{c0 as f,c1 as y,c2 as D,c3 as S,au as w,c4 as b,M as T,c5 as A,B as V,a4 as v,af as U,x as m,aF as x,aj as O,r as _,p as h,c6 as c,c7 as p,c8 as F}from"./light-system-CKM-wB-F.js";const R="3.4.2",P="1.0.1";class G{constructor(e){this.useFloat32=e}createDataArrayTexture(e,t){this.dataArrayTexture&&this.dataArrayTexture.dispose();const a=2;if(this.useFloat32){const i=e*t;this.combinedArray=new Float32Array(i*a),this.dataArrayTexture=new f(this.combinedArray,e,t,a),this.dataArrayTexture.format=y,this.dataArrayTexture.type=D}else{const i=e*t*2;this.combinedArray=new Uint8Array(i*a),this.dataArrayTexture=new f(this.combinedArray,e,t,a),this.dataArrayTexture.format=S,this.dataArrayTexture.type=w}}updateData(e,t){if((!this.dataArrayTexture||this.dataArrayTexture.image.width!==e.width||this.dataArrayTexture.image.height!==e.height)&&this.createDataArrayTexture(e.width,e.height),this.useFloat32){const a=new Float32Array(e.data),i=e.width*e.height;this.combinedArray.set(a,t*i)}else{const a=new Uint8Array(e.data),i=e.width*e.height*2;this.combinedArray.set(a,t*i)}this.dataArrayTexture.addLayerUpdate(t),this.dataArrayTexture.needsUpdate=!0}updateNativeTexture(e,t){this.nativeTexture?this.nativeTexture.sourceTexture=e.texture:this.nativeTexture=new b(e.texture);const a=t.properties.get(this.nativeTexture);a.__webglTexture=e.texture,a.__version=1}getNativeTexture(){return this.nativeTexture}getDataArrayTexture(){return this.dataArrayTexture}dispose(){var e;(e=this.dataArrayTexture)===null||e===void 0||e.dispose(),this.dataArrayTexture=void 0,this.combinedArray=void 0,this.nativeTexture=void 0}}const z=new A(-1,1,1,-1,0,1);class E extends V{constructor(){super(),this.setAttribute("position",new v([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new v([0,2,0,0,2,0],2))}}const C=new E;class I{constructor(e){this._mesh=new T(C,e)}dispose(){this._mesh.geometry.dispose()}render(e){const t=e.xr.enabled;e.xr.enabled=!1,e.render(this._mesh,z),e.xr.enabled=t}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}const g={vertexShader:`
varying vec2 vUv;

void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,fragmentShader:`
precision highp float;

uniform sampler2DArray uXRDepthTextureArray;
uniform float uRawValueToMeters;
uniform int uViewId;
uniform vec2 uDepthTextureSize;
uniform bool uIsGPUDepth;
uniform float uDepthNear;

varying vec2 vUv;

float depthToMeters(float textureValue) {
	if (uIsGPUDepth) {
		return uRawValueToMeters * uDepthNear / (1.0 - textureValue);
	}
	return textureValue * uRawValueToMeters;
}

void main() {
	vec2 texelSize = 1.0 / uDepthTextureSize;
	vec2 baseUV = vUv - texelSize * 1.5;

	// Single pass: sample 4×4 neighborhood, convert, and store in 4 vec4s
	vec4 depths[4];
	float rawMin = 1e20;
	float rawMax = 0.0;
	float sum = 0.0;
	int count = 0;

	for (int row = 0; row < 4; row++) {
		for (int col = 0; col < 4; col++) {
			vec2 sampleUV = baseUV + vec2(float(col), float(row)) * texelSize;
			float rawValue = texture(uXRDepthTextureArray, vec3(sampleUV, float(uViewId))).r;
			float meters = depthToMeters(rawValue);
			depths[row][col] = meters;

			if (meters > 0.0) {
				rawMin = min(rawMin, meters);
				rawMax = max(rawMax, meters);
				sum += meters;
				count++;
			}
		}
	}

	if (count == 0) {
		gl_FragColor = vec4(0.0);
		return;
	}

	float avg = sum / float(count);

	// Group samples near the min (within 115%) and near the max (within 85%)
	// to compute stable minAvg and maxAvg — ported from CalculateMinMaxDepth
	float minThreshold = rawMin * 1.15;
	float maxThreshold = rawMax * 0.85;

	// Degenerate case: neighborhood is uniform (within both thresholds)
	if (maxThreshold < rawMin && minThreshold > rawMax) {
		gl_FragColor = vec4(avg, avg, 0.0, 0.0);
		return;
	}

	// Vectorized clustering using stored depths — no second sampling loop
	float minSumDepth = 0.0;
	float minSumCount = 0.0;
	float maxSumDepth = 0.0;
	float maxSumCount = 0.0;

	for (int i = 0; i < 4; i++) {
		vec4 valid = vec4(greaterThan(depths[i], vec4(0.0)));
		vec4 minMask = vec4(lessThanEqual(depths[i], vec4(minThreshold))) * valid;
		vec4 maxMask = vec4(greaterThanEqual(depths[i], vec4(maxThreshold))) * valid;
		minSumDepth += dot(minMask, depths[i]);
		minSumCount += dot(minMask, vec4(1.0));
		maxSumDepth += dot(maxMask, depths[i]);
		maxSumCount += dot(maxMask, vec4(1.0));
	}

	float minAvg = minSumCount > 0.0 ? minSumDepth / minSumCount : rawMin;
	float maxAvg = maxSumCount > 0.0 ? maxSumDepth / maxSumCount : rawMax;

	gl_FragColor = vec4(minAvg, maxAvg, avg - minAvg, maxAvg - minAvg);
}
`};class N{constructor(){this.material=new U({name:"DepthPreprocessing",uniforms:{uXRDepthTextureArray:{value:null},uRawValueToMeters:{value:.001},uViewId:{value:0},uDepthTextureSize:{value:new m},uIsGPUDepth:{value:!1},uDepthNear:{value:0}},vertexShader:g.vertexShader,fragmentShader:g.fragmentShader});const e={format:O,type:D};this.renderTargets=[new x(1,1,e),new x(1,1,e)],this.fsQuad=new I(this.material)}setDepthTexture(e,t,a,i){this.material.uniforms.uXRDepthTextureArray.value=e,this.material.uniforms.uRawValueToMeters.value=t,this.material.uniforms.uIsGPUDepth.value=a,this.material.uniforms.uDepthNear.value=i}render(e,t,a,i=0){const n=this.renderTargets[i];(n.width!==t||n.height!==a)&&n.setSize(t,a),this.material.uniforms.uViewId.value=i,this.material.uniforms.uDepthTextureSize.value.set(t,a);const r=e.getRenderTarget(),s=e.xr.enabled;e.xr.enabled=!1,e.setRenderTarget(n),this.fsQuad.render(e),e.setRenderTarget(r),e.xr.enabled=s}getTexture(e=0){return this.renderTargets[e].texture}dispose(){for(const e of this.renderTargets)e.dispose();this.material.dispose(),this.fsQuad.dispose()}}class M extends _({occludables:{required:[c]}},{enableOcclusion:{type:h.Boolean,default:!0},enableDepthTexture:{type:h.Boolean,default:!0},useFloat32:{type:h.Boolean,default:!0},blurRadius:{type:h.Float32,default:20}}){constructor(){super(...arguments),this.cpuDepthData=[],this.gpuDepthData=[],this.hasCurrentFrameDepthData=!1,this.entityShaderMap=new Map,this.viewportSize=new m,this.minMaxEntityCount=0}get rawValueToMeters(){return this.cpuDepthData.length?this.cpuDepthData[0].rawValueToMeters:this.gpuDepthData.length?this.gpuDepthData[0].rawValueToMeters:0}init(){const e=()=>{this.cleanup(),this.updateEnabledFeatures(this.xrManager.getSession())},t=()=>{this.cleanup()};this.xrManager.addEventListener("sessionstart",e),this.xrManager.addEventListener("sessionend",t),this.cleanupFuncs.push(()=>{this.xrManager.removeEventListener("sessionstart",e),this.xrManager.removeEventListener("sessionend",t)}),this.cleanupFuncs.push(this.config.enableDepthTexture.subscribe(a=>{a&&!this.depthTextures&&this.initializeDepthTextures()})),this.cleanupFuncs.push(this.queries.occludables.subscribe("qualify",a=>{this.attachOcclusionToEntity(a),c.data.mode[a.index]===p.MinMaxSoftOcclusion&&this.minMaxEntityCount++},!0),this.queries.occludables.subscribe("disqualify",a=>{c.data.mode[a.index]===p.MinMaxSoftOcclusion&&this.minMaxEntityCount--,this.detachOcclusionFromEntity(a)})),this.cleanupFuncs.push(()=>{var a,i;this.clearAllOcclusionUniforms(),(a=this.depthTextures)===null||a===void 0||a.dispose(),this.depthTextures=void 0,(i=this.preprocessingPass)===null||i===void 0||i.dispose(),this.preprocessingPass=void 0})}initializeDepthTextures(){this.depthTextures=new G(this.config.useFloat32.value)}attachOcclusionToEntity(e){const t=e.object3D;if(!t)return;const a=new Set;this.entityShaderMap.set(e,a),t.traverse(i=>{var n;if(!(i instanceof T))return;const r=Array.isArray(i.material)?i.material:[i.material];for(const s of r){if(!s)continue;s.transparent=!0;const l=(n=s.onBeforeCompile)===null||n===void 0?void 0:n.bind(s);s.onBeforeCompile=(o,u)=>{l&&l(o,u),o.uniforms.occlusionEnabled||M.addOcclusionToShader(o),s.userData.shader=o,a.add(o.uniforms)},s.needsUpdate=!0}})}detachOcclusionFromEntity(e){const t=this.entityShaderMap.get(e);t&&this.clearOcclusionUniforms(t),this.entityShaderMap.delete(e)}clearOcclusionUniforms(e){for(const t of e)t.occlusionEnabled.value=!1,t.uXRDepthTextureArray.value=null,t.uMinMaxTexture0.value=null,t.uMinMaxTexture1.value=null}clearAllOcclusionUniforms(){for(const e of this.entityShaderMap.values())this.clearOcclusionUniforms(e)}static addOcclusionToShader(e){var t;e.uniforms.occlusionEnabled={value:!1},e.uniforms.uXRDepthTextureArray={value:null},e.uniforms.uRawValueToMeters={value:.001},e.uniforms.uIsGPUDepth={value:!1},e.uniforms.uDepthNear={value:0},e.uniforms.uViewportSize={value:new m},e.uniforms.uOcclusionBlurRadius={value:20},e.uniforms.uOcclusionHardMode={value:!1},e.uniforms.uOcclusionMinMaxMode={value:!1},e.uniforms.uMinMaxTexture0={value:null},e.uniforms.uMinMaxTexture1={value:null},e.defines={...(t=e.defines)!==null&&t!==void 0?t:{},USE_UV:!0},e.vertexShader=e.vertexShader.replace("#include <common>",["varying float vOcclusionViewDepth;","#include <common>"].join(`
`)).replace("#include <fog_vertex>",["#include <fog_vertex>","vec4 occlusion_view_pos = modelViewMatrix * vec4(position, 1.0);","vOcclusionViewDepth = -occlusion_view_pos.z;"].join(`
`)),e.fragmentShader=e.fragmentShader.replace("uniform vec3 diffuse;",["uniform vec3 diffuse;","uniform bool occlusionEnabled;","uniform float uRawValueToMeters;","uniform bool uIsGPUDepth;","uniform float uDepthNear;","uniform vec2 uViewportSize;","uniform float uOcclusionBlurRadius;","uniform bool uOcclusionHardMode;","uniform bool uOcclusionMinMaxMode;","uniform sampler2D uMinMaxTexture0;","uniform sampler2D uMinMaxTexture1;","varying float vOcclusionViewDepth;","","uniform sampler2DArray uXRDepthTextureArray;","","// Fallback for non-multiview sessions","#ifndef VIEW_ID","#define VIEW_ID 0","#endif","","float OcclusionDepthGetMeters(in vec2 uv) {","  float textureValue = texture(uXRDepthTextureArray, vec3(uv.x, uv.y, float(VIEW_ID))).r;","  if (uIsGPUDepth) {","    return uRawValueToMeters * uDepthNear / (1.0 - textureValue);","  }","  return textureValue * uRawValueToMeters;","}","","float OcclusionGetSample(in vec2 depthUV, in vec2 offset) {","  float sampleDepth = OcclusionDepthGetMeters(depthUV + offset);","  return smoothstep(0.0, 0.05, sampleDepth - vOcclusionViewDepth);","}"].join(`
`)).replace("vec4 diffuseColor = vec4( diffuse, opacity );",["vec4 diffuseColor = vec4( diffuse, opacity );","if (occlusionEnabled) {","  vec2 screenUV = gl_FragCoord.xy / uViewportSize;","  vec2 depthUV = uIsGPUDepth ? screenUV : vec2(screenUV.x, 1.0 - screenUV.y);","  float occlusion_value;","  if (uOcclusionMinMaxMode) {","    // MinMax soft occlusion — two-cluster edge-aware blending","    vec4 mmData;","    if (uint(VIEW_ID) == 0u) {","      mmData = texture2D(uMinMaxTexture0, depthUV);","    } else {","      mmData = texture2D(uMinMaxTexture1, depthUV);","    }","    float minAvgDepth = mmData.r;","    float maxAvgDepth = mmData.g;","    float midAvgDepth = mmData.r + mmData.b;","    float fadeRange = vOcclusionViewDepth * 0.04;","    float fadeRangeInv = 1.0 / max(fadeRange, 0.001);","    vec3 envDepths = vec3(minAvgDepth, maxAvgDepth, midAvgDepth);","    vec3 occAlphas = clamp((envDepths - vOcclusionViewDepth) * fadeRangeInv, 0.0, 1.0);","    occlusion_value = occAlphas.z;","    float alphaDiff = occAlphas.y - occAlphas.x;","    if (alphaDiff > 0.03) {","      float denom = mmData.a;","      float interp = denom > 0.001 ? mmData.b / denom : 0.5;","      occlusion_value = mix(occAlphas.x, occAlphas.y, smoothstep(0.2, 0.8, interp));","    }","  } else if (uOcclusionHardMode) {","    occlusion_value = OcclusionGetSample(depthUV, vec2(0.0));","  } else {","   vec2 texelSize = uOcclusionBlurRadius / uViewportSize;","   // 13-tap two-ring sampling pattern for smooth occlusion edges","   // Center sample","   occlusion_value = OcclusionGetSample(depthUV, vec2(0.0));","   // Inner ring: 6 samples at 40% radius, 60 degree intervals","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2( 0.4,  0.0));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2( 0.2,  0.346));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2(-0.2,  0.346));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2(-0.4,  0.0));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2(-0.2, -0.346));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2( 0.2, -0.346));","   // Outer ring: 6 samples at full radius, offset 30 degrees","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2( 0.866,  0.5));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2( 0.0,    1.0));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2(-0.866,  0.5));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2(-0.866, -0.5));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2( 0.0,   -1.0));","   occlusion_value += OcclusionGetSample(depthUV, texelSize * vec2( 0.866, -0.5));","   occlusion_value /= 13.0;","  }","  if (occlusion_value < 0.01) {","      discard;","  }","  diffuseColor.a *= occlusion_value;","}"].join(`
`))}cleanup(){var e;this.depthFeatureEnabled=void 0,this.cpuDepthData=[],this.gpuDepthData=[],this.hasCurrentFrameDepthData=!1,this.clearAllOcclusionUniforms(),(e=this.preprocessingPass)===null||e===void 0||e.dispose(),this.preprocessingPass=void 0}updateEnabledFeatures(e){if(!e)return;const t=e.enabledFeatures;this.depthFeatureEnabled=t?.includes("depth-sensing"),this.depthFeatureEnabled||console.log("Warning: depth-sensing feature not enabled for WebXR session. Depth sensing features are disabled.")}update(){if(!this.depthFeatureEnabled)return;this.hasCurrentFrameDepthData=!1,this.cpuDepthData.length=0,this.gpuDepthData.length=0;const e=this.xrFrame;if(e&&this.updateLocalDepth(e),!this.hasCurrentFrameDepthData){this.clearAllOcclusionUniforms();return}this.config.enableOcclusion.value?(this.runMinMaxPreprocessing(),this.updateOcclusionUniforms()):this.clearAllOcclusionUniforms()}get isGPUDepth(){const e=this.xrManager.getSession();return e?.depthUsage==="gpu-optimized"}getDepthTextureArray(){var e,t;if(this.hasCurrentFrameDepthData)return this.isGPUDepth?(e=this.depthTextures)===null||e===void 0?void 0:e.getNativeTexture():(t=this.depthTextures)===null||t===void 0?void 0:t.getDataArrayTexture()}runMinMaxPreprocessing(){var e,t;if(this.minMaxEntityCount===0)return;const a=this.getDepthTextureArray();if(!a)return;const i=this.isGPUDepth,n=(t=(e=this.gpuDepthData[0])===null||e===void 0?void 0:e.depthNear)!==null&&t!==void 0?t:0;this.preprocessingPass||(this.preprocessingPass=new N),this.preprocessingPass.setDepthTexture(a,this.rawValueToMeters,i,n);let r,s;if(this.cpuDepthData[0])r=this.cpuDepthData[0].width,s=this.cpuDepthData[0].height;else if(this.gpuDepthData[0])r=this.gpuDepthData[0].width,s=this.gpuDepthData[0].height;else return;this.preprocessingPass.render(this.renderer,r,s,0),this.preprocessingPass.render(this.renderer,r,s,1)}updateLocalDepth(e){const t=e.session,a=this.renderer.xr.getBinding(),i=this.renderer.xr.getReferenceSpace();if(i){const n=e.getViewerPose(i);if(n)if(t.depthUsage==="gpu-optimized"){const r=n.views[0];if(!r)return;const s=a.getDepthInformation(r);s&&(this.updateGPUDepthData(s),this.hasCurrentFrameDepthData=!0)}else{const r=[];for(let s=0;s<n.views.length;++s){const l=n.views[s],o=e.getDepthInformation(l);if(!o)return;r.push(o)}for(let s=0;s<r.length;++s)this.updateCPUDepthData(r[s],s);this.hasCurrentFrameDepthData=r.length>0}}}updateCPUDepthData(e,t=0){this.cpuDepthData[t]=e,this.config.enableDepthTexture.value&&this.depthTextures&&this.depthTextures.updateData(e,t)}updateGPUDepthData(e){this.gpuDepthData[0]=e,this.config.enableDepthTexture.value&&this.depthTextures&&this.depthTextures.updateNativeTexture(e,this.renderer)}updateOcclusionUniforms(){var e,t;const a=this.getDepthTextureArray();if(!a){this.clearAllOcclusionUniforms();return}const i=this.isGPUDepth,n=(t=(e=this.gpuDepthData[0])===null||e===void 0?void 0:e.depthNear)!==null&&t!==void 0?t:0;this.renderer.getDrawingBufferSize(this.viewportSize);for(const[r,s]of this.entityShaderMap){const l=c.data.mode[r.index]===p.HardOcclusion,o=c.data.mode[r.index]===p.MinMaxSoftOcclusion;for(const u of s)u.uXRDepthTextureArray.value=a,u.uRawValueToMeters.value=this.rawValueToMeters,u.uIsGPUDepth.value=i,u.uDepthNear.value=n,u.uViewportSize.value.copy(this.viewportSize),u.uOcclusionBlurRadius.value=this.config.blurRadius.value,u.uOcclusionHardMode.value=l,u.uOcclusionMinMaxMode.value=o,u.occlusionEnabled.value=this.config.enableOcclusion.value,o&&this.preprocessingPass&&(u.uMinMaxTexture0.value=this.preprocessingPass.getTexture(0),u.uMinMaxTexture1.value=this.preprocessingPass.getTexture(1))}}}console.log(`                                                 
▄▄▄▄▄▄  ▄▄      ▄▄   ▄▄▄▄    ▄▄▄▄▄     ▄▄   ▄▄▄ 
▀▀██▀▀  ██      ██ ▄█▀▀▀▀█   ██▀▀▀██   ██  ██▀  
  ██    ▀█▄ ██ ▄█▀ ██▄       ██    ██  ██▄██    
  ██     ██ ██ ██   ▀████▄   ██    ██  █████    
  ██     ███▀▀███       ▀██  ██    ██  ██  ██▄  
▄▄██▄▄   ███  ███  █▄▄▄▄▄█▀  ██▄▄▄██   ██   ██▄ 
▀▀▀▀▀▀   ▀▀▀  ▀▀▀   ▀▀▀▀▀    ▀▀▀▀▀     ▀▀    ▀▀                                                
===============================================
Immersive Web SDK v${P}
Three.js r${F}
EliCS v${R}`);
