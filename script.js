var noise = `
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}
vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec4 j = p - 49.0 * floor(p * (1.0 / 49.0));
  vec4 x_ = floor(j * (1.0 / 7.0));
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * (1.0 / 7.0);
  vec4 y = y_ * (1.0 / 7.0);
  vec4 v_ = x * x + y * y;
  vec4 h = 1.0 - v_;
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

var hide = true;
var circle = document.getElementById('circle');
var info = document.getElementById('info');

circle.addEventListener("click", function() {
    if (hide) {
        circle.style.background = "darkorange";
        circle.style.color = "orange";
        info.style.width = "640px";
        info.style.height = "214px";
    } else {
        circle.style.background = "rgba(255, 165, 0, .5)";
        circle.style.color = "rgba(255, 165, 0, 1)";
        info.style.width = "62px";
        info.style.height = "62px";
    }
    hide = !hide;
}, false);





// Configuração básica da cena, câmera e renderizador
var materialShaders = [];
var speed = 10;
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.3, 7);
camera.lookAt(scene.position);
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);



// Controle de órbita
var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * 0.55;
controls.minPolarAngle = Math.PI * 0.25;
controls.target.set(0, 1.8, 0);
controls.update();

// Configurar o plano da estrada
var planeGeom = new THREE.PlaneBufferGeometry(100, 100, 200, 200);
planeGeom.rotateX(-Math.PI * 0.5);
var planeMat = new THREE.MeshBasicMaterial({ color: 0xff00ee });
planeMat.onBeforeCompile = shader => {
    shader.uniforms.time = { value: 0 };
    shader.vertexShader =
        `
        uniform float time;
        varying vec3 vPos;
        ` + noise + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
        vec2 tuv = uv;
        float t = time * 0.01 * ${speed}.; 
        tuv.y += t;
        transformed.y = snoise(vec3(tuv * 5., 0.)) * 5.;
        transformed.y *= smoothstep(5., 15., abs(transformed.x)); // road stripe
        vPos = transformed;
        `
    );
    shader.fragmentShader =
        `
        #extension GL_OES_standard_derivatives : enable
        uniform float time;
        varying vec3 vPos;
        float line(vec3 position, float width, vec3 step){
            vec3 tempCoord = position / step;
            vec2 coord = tempCoord.xz;
            coord.y -= time * ${speed}. / 2.;
            vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord * width);
            float line = min(grid.x, grid.y);
            return min(line, 1.0);
        }
        ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
        `gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,
        `
        float l = line(vPos, 2.0, vec3(2.0));
        vec3 base = mix(vec3(0, 0.75, 1), vec3(0), smoothstep(5., 7.5, abs(vPos.x)));
        vec3 c = mix(outgoingLight, base, l);
        gl_FragColor = vec4(c, diffuseColor.a);
        `
    );
    materialShaders.push(shader);
};
var plane = new THREE.Mesh(planeGeom, planeMat);
scene.add(plane);

// Configurar palmeiras
var palmGeoms = [];
// Tronco
var logGeom = new THREE.CylinderBufferGeometry(0.25, 0.125, 10, 5, 4, true);
logGeom.translate(0, 5, 0);
palmGeoms.push(logGeom);
// Folhas
for (let i = 0; i < 20; i++) {
    let leafGeom = new THREE.CircleBufferGeometry(1.25, 4);
    leafGeom.translate(0, 1.25, 0);
    leafGeom.rotateX(-Math.PI * 0.5);
    leafGeom.scale(0.25, 1, THREE.Math.randFloat(1, 1.5));
    leafGeom.attributes.position.setY(0, 0.25);
    leafGeom.rotateX(THREE.Math.randFloatSpread(Math.PI * 0.5));
    leafGeom.rotateY(THREE.Math.randFloat(0, Math.PI * 2));
    leafGeom.translate(0, 10, 0);
    palmGeoms.push(leafGeom);
}
// Mesclar geometrias
var palmGeom = THREE.BufferGeometryUtils.mergeBufferGeometries(palmGeoms, false);
palmGeom.rotateZ(THREE.Math.degToRad(-1.5));
// Instanciando
var instPalm = new THREE.InstancedBufferGeometry();
instPalm.attributes.position = palmGeom.attributes.position;
instPalm.attributes.uv = palmGeom.attributes.uv;
instPalm.index = palmGeom.index;
palmPos = [];
for (let i = 0; i < 5; i++) {
    palmPos.push(-5, 0, i * 20 - 10 - 50);
    palmPos.push(5, 0, i * 20 - 50);
}
instPalm.addAttribute(
    "instPosition",
    new THREE.InstancedBufferAttribute(new Float32Array(palmPos), 3)
);

var palmMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
palmMat.onBeforeCompile = shader => {
    shader.uniforms.time = { value: 0 };
    shader.vertexShader =
        `
        uniform float time;
        attribute vec3 instPosition;
        ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
        transformed.x *= sign(instPosition.x); // flip
        vec3 ip = instPosition;
        ip.z = mod(50. + ip.z + time * ${speed}., 100.) - 50.;
        transformed *= 0.4 + smoothstep(50., 45., abs(ip.z)) * 0.6;
        transformed += ip;
        `
    );
    materialShaders.push(shader);
}
var palms = new THREE.Mesh(instPalm, palmMat);
scene.add(palms);

// Sol
var sunGeom = new THREE.CircleBufferGeometry(200, 64);
var sunMat = new THREE.MeshBasicMaterial({ color: 0xff8800, fog: false, transparent: true });
sunMat.onBeforeCompile = shader => {
    shader.uniforms.time = { value: 0 };
    shader.vertexShader =
        `
        varying vec2 vUv;
        ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
        vUv = uv;
        `
    );
    shader.fragmentShader =
        `
        varying vec2 vUv;
        ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
        `gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,
        `gl_FragColor = vec4( outgoingLight, diffuseColor.a * smoothstep(0.5, 0.7, vUv.y));`
    );
    materialShaders.push(shader);
}
var sun = new THREE.Mesh(sunGeom, sunMat);
sun.position.set(0, 0, -500);
scene.add(sun);

// Loop de renderização
var clock = new THREE.Clock();
var time = 0;


/*// GLTF
// Configuração do veículo
var vehicle;

// Inicializar o GLTFLoader
var loader = new THREE.GLTFLoader();

// Carregar o modelo GLTF/GLB
loader.load(
    'car.glb',  // Caminho para o arquivo .gltf ou .glb
    function (gltf) {
        vehicle = gltf.scene;
        vehicle.position.set(0, 0.5, 0);
        vehicle.rotation.set(0, 3, 0);  // Rotação de 90 graus no eixo X
        vehicle.scale.set(0.3, 0.3, 0.3);  // Reduzir o tamanho para 70%
        scene.add(vehicle);
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% carregado');
    },
    function (error) {
        console.log('Erro ao carregar o modelo 3D', error);
    }
);
*/




/*// Configuração do veículo so o obj
// Criar uma variável para armazenar o objeto carregado
var vehicle;

// Inicializar o OBJLoader
var loader = new THREE.OBJLoader();

// Carregar o modelo OBJ
loader.load(
    'car.obj',
    function (object) {
        vehicle = object;
        vehicle.position.set(0, 0.5, 0);
        vehicle.rotation.set(0, 3, 0);  // Rotação de 90 graus no eixo X
        vehicle.scale.set(0.3, 0.3, 0.3);  // Reduzir o tamanho para 70%
        scene.add(vehicle);
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% carregado');
    },
    function (error) {
        console.log('Erro ao carregar o modelo 3D', error);
    }
);*/






// Configuração do veículo mtl e obj
// Criar uma variável para armazenar o objeto carregado
var vehicle;

// Inicializar o MTLLoader
var mtlLoader = new THREE.MTLLoader();

// Carregar o material MTL
mtlLoader.load('carro/car.mtl', function (materials) {
    materials.preload();
    console.log('Materiais carregados:', materials);

    // Inicializar o OBJLoader
    var objLoader = new THREE.OBJLoader();

    // Passar os materiais carregados para o OBJLoader
    objLoader.setMaterials(materials);

    // Carregar o modelo OBJ
    objLoader.load(
        'carro/car.obj',
        function (object) {
            vehicle = object;
            vehicle.position.set(0, 0.6, 0);
            vehicle.rotation.set(Math.PI / 2, Math.PI / 1, 0);  // Rotação de 90 graus nos eixos X e Y
            vehicle.scale.set(0.1, 0.1, 0.1);  // Reduzir o tamanho para 10%
            scene.add(vehicle);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% carregado');
        },
        function (error) {
            console.log('Erro ao carregar o modelo 3D', error);
        }
    );
});

// Adicionar uma luz ambiente
var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Adicionar uma luz direcional
var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 10, 10);
scene.add(directionalLight);



// Velocidade de movimento do veículo
var vehicleSpeed = 0.1;

// Array para armazenar obstáculos
var obstacles = [];
var obstacleGenerating = false; // Flag para controlar se está gerando um obstáculo

// Função para gerar um único obstáculo
function generateObstacle() {
    if (obstacleGenerating) return; // Se já estiver gerando um obstáculo, saia

    obstacleGenerating = true;

    // Cores e texturas vaporwave
    var vaporwaveColors = [
        0xff77a9, // rosa
        0x66c0ff, // azul claro
        0xff66ff, // rosa neon
        0xffcc00, // amarelo
        0x33ffcc, // verde azulado
        0xcc33ff, // roxo
        0x00ffcc  // turquesa
    ];

    var colorIndex = Math.floor(Math.random() * vaporwaveColors.length); // Escolher uma cor aleatória

    // Criar material com efeito vaporwave e transparência
    var obstacleMaterial = new THREE.MeshStandardMaterial({
        color: vaporwaveColors[colorIndex],
        emissive: vaporwaveColors[colorIndex], // Emissão da mesma cor para o efeito vaporwave
        emissiveIntensity: 0.5, // Intensidade da emissão
        roughness: 0.2, // Rugosidade ajustada para um brilho suave
        metalness: 0, // Sem metalness
        transparent: true, // Material transparente
        opacity: 0.8 // Nível de opacidade (80% transparente)
    });

    // Textura para o mapa de emissão (opcional, dependendo do estilo desejado)
    var textureLoader = new THREE.TextureLoader();
    var emissionTexture = textureLoader.load('textures/vaporwave.png'); // Textura para o efeito de emissão
    obstacleMaterial.emissiveMap = emissionTexture;

    var obstacleGeometry = new THREE.BoxGeometry(1, 1, 1); // Tamanho do cubo
    var obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);

    // Definir distância mínima e máxima à frente do veículo
    var minDistance = 30; // Distância mínima à frente do veículo
    var maxDistance = 50; // Distância máxima à frente do veículo
    var vehicleZ = vehicle.position.z; // Posição atual do veículo na profundidade da estrada

    // Posicionar o obstáculo aleatoriamente na estrada com distância aleatória
    var randomX = THREE.MathUtils.randFloat(-5, 5); // Posição X aleatória na largura da estrada
    var randomZ = vehicleZ - THREE.MathUtils.randFloat(minDistance, maxDistance); // Posição Z aleatória limitada

    // Ajustar para garantir que o obstáculo não seja gerado muito perto do veículo
    if (randomZ > vehicleZ - minDistance) {
        randomZ = vehicleZ - minDistance;
    }

    obstacle.position.set(randomX, 0.5, randomZ);

    scene.add(obstacle);
    obstacles.push(obstacle);

    // Remover o obstáculo após 60 segundos
    setTimeout(function() {
        scene.remove(obstacle);
        obstacles.splice(obstacles.indexOf(obstacle), 1);
    }, 60000); // 60 segundos

    // Permitir a geração do próximo obstáculo após um atraso
    setTimeout(function() {
        obstacleGenerating = false;
    }, 1000); // Ajuste o tempo de atraso conforme necessário
}

// Chame a função generateObstacle() repetidamente para gerar múltiplos obstáculos
setInterval(generateObstacle, 5000); // Gera um novo obstáculo a cada 5 segundos (ajuste conforme necessário)

// Adicionar uma luz ambiente
var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Adicionar uma luz direcional
var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 10, 10);
scene.add(directionalLight);

// Função de animação
function animate() {
    requestAnimationFrame(animate);

    // Atualizar a posição dos obstáculos (se necessário)
    obstacles.forEach(function(obstacle) {
        // Adicione qualquer lógica de movimento ou animação dos obstáculos aqui
    });

    renderer.render(scene, camera);
}

animate();



// Função para verificar colisão entre o veículo e obstáculos
function checkCollision() {
    if (!vehicle) return false; // Verifica se vehicle está definido

    var vehicleBox = new THREE.Box3().setFromObject(vehicle);
    var obstacleBox = new THREE.Box3();

    for (var i = 0; i < obstacles.length; i++) {
        if (!obstacles[i]) continue; // Verifica se o obstáculo está definido

        obstacleBox.setFromObject(obstacles[i]);
        if (vehicleBox.intersectsBox(obstacleBox)) {
            console.log("Game Over! Colisão com o obstáculo.");
            return true; // Indica que houve colisão
        }
    }

    return false; // Não houve colisão
}


// Adicionar listener para eventos de teclado
document.addEventListener('keydown', function(event) {
    switch(event.keyCode) {
        case 37: // Seta para a esquerda
            moveVehicleLeft();
            break;
        case 39: // Seta para a direita
            moveVehicleRight();
            break;
    }
});

// Função para mover o veículo para a esquerda
function moveVehicleLeft() {
    if (vehicle.position.x > -5) { // Limite esquerdo da estrada
        vehicle.position.x -= vehicleSpeed;
    }
}

// Função para mover o veículo para a direita
function moveVehicleRight() {
    if (vehicle.position.x < 5) { // Limite direito da estrada
        vehicle.position.x += vehicleSpeed;
    }
}


// Pontuação na tela
let score = 0;
const scoreInterval = 2000; // Intervalo de tempo em milissegundos
let intervalId;
let gameOver = false;

// Função para atualizar a pontuação
function updateScore() {
    score += 1;
}

// Inicia a atualização da pontuação a cada 20 milissegundos
intervalId = setInterval(updateScore, scoreInterval);

// Crie um canvas separado para a pontuação
const scoreCanvas = document.createElement('canvas');
scoreCanvas.width = window.innerWidth;
scoreCanvas.height = window.innerHeight;
scoreCanvas.style.position = 'absolute';
scoreCanvas.style.top = '0';
scoreCanvas.style.left = '0';
scoreCanvas.style.pointerEvents = 'none'; // Permite cliques através do canvas
document.body.appendChild(scoreCanvas);
const scoreCtx = scoreCanvas.getContext('2d');

// Função para desenhar a pontuação na tela
function drawScore() {
    scoreCtx.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height); // Limpa o canvas
    scoreCtx.font = '30px Arial'; // Aumentei o tamanho da fonte para melhor visibilidade
    scoreCtx.fillStyle = '#ff00ff'; // Rosa neon
    scoreCtx.shadowColor = '#ff00ff';
    scoreCtx.shadowBlur = 10; // Ajuste o valor para um efeito de neon mais forte
    scoreCtx.fillText(`Score: ${score}`, window.innerWidth - 150, 50);
}



// Função para desenhar a mensagem de "Game Over"
function drawGameOver() {
    scoreCtx.font = '50px Arial';
    scoreCtx.fillStyle = '#ff00ff';
    scoreCtx.shadowColor = '#ff00ff';
    scoreCtx.shadowBlur = 20;
    scoreCtx.textAlign = 'center';
    scoreCtx.fillText('Game Over', window.innerWidth / 2, window.innerHeight / 2);
}






// Array de músicas
const musicPaths = [
    'mp3/Lucide.mp3',
	'mp3/Partly.mp3',
    // Adicione mais caminhos de músicas conforme necessário
];

let musicPlaying = false; // Flag para controlar se a música está sendo reproduzida

// Função para tocar uma música aleatoriamente
function playRandomMusic() {
    const randomIndex = Math.floor(Math.random() * musicPaths.length);
    const audio = new Audio(musicPaths[randomIndex]);

    audio.addEventListener('ended', function() {
        playRandomMusic(); // Reproduzir outra música quando terminar
    });

    audio.play()
        .then(() => {
            console.log('Música iniciada com sucesso!');
            musicPlaying = true; // Marcar que a música está sendo reproduzida
        })
        .catch(error => {
            console.error('Erro ao iniciar música:', error);
        });
}

// Adicionar eventos para iniciar a reprodução com qualquer clique do teclado ou mouse
document.addEventListener('keydown', function(event) {
    if (!musicPlaying) {
        playRandomMusic();
    }
}, { once: true });

document.addEventListener('click', function(event) {
    if (!musicPlaying) {
        playRandomMusic();
    }
}, { once: true });



// Função de renderização
function render() {
    
    if (resize(renderer)) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
    time = clock.getElapsedTime();
    materialShaders.forEach(m => {
        m.uniforms.time.value = time;
    });

    // Movimentar obstáculos
    obstacles.forEach(function(obstacle) {
        obstacle.position.z += 0.1; // Movimento dos obstáculos para frente
        // Lógica para remover obstáculos que saíram da cena (opcional)
    });

    // Verificar colisão game over
    if (checkCollision()) {
        // Lógica para game over
        //clearInterval(intervalId); // Parar a atualização da pontuação
        //gameOver = true; // Define a variável de estado do jogo como game over
	
    }

    renderer.render(scene, camera);

    // Desenhar a pontuação
    drawScore();

    // Desenhar a mensagem de game over, se necessário
    if (gameOver) {
        drawGameOver();
        return; // Para de renderizar o resto do jogo
    }

    requestAnimationFrame(render);
    
}



// Função para gerar obstáculos periodicamente
setInterval(function() {
    generateObstacle();
}, 1000); // A cada 1 segundos (ajuste conforme necessário)

// Função de redimensionamento
function resize(renderer) {
    const canvas = renderer.domElement;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

render(); // Iniciar a renderização


