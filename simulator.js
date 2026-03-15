const canvas = document.getElementById("simCanvas")
const ctx = canvas.getContext("2d")

canvas.width = 900
canvas.height = 600

const k = 8.99e9
const EPS = 25

const BASE_STEP = 4
const MIN_STEP = 0.5
const MAX_STEP = 6

const LINE_MIN_DIST = 6

let probe=null
let dragging=null

let charges=[
{ name:"Charge A", x:300, y:300, q:1 },
{ name:"Charge B", x:600, y:300, q:-1 }
]

let fieldLines=[]
let fieldLineSources=[]

function electricField(x,y){

let Ex=0
let Ey=0

for(let c of charges){

let dx=x-c.x
let dy=y-c.y

let r2=dx*dx+dy*dy+EPS
let r=Math.sqrt(r2)

let E=k*c.q/r2

Ex+=E*(dx/r)
Ey+=E*(dy/r)

}

return {Ex,Ey}

}

function magnitude(v){
return Math.sqrt(v.Ex*v.Ex+v.Ey*v.Ey)
}

function normalize(v){

let m=magnitude(v)

if(m<1e-12) return null

return {x:v.Ex/m,y:v.Ey/m}

}

function rk4(x,y,dir,step){

function field(px,py){

let f=electricField(px,py)
let n=normalize(f)

if(!n) return dir
return n

}

let k1=field(x,y)
let k2=field(x+k1.x*step/2,y+k1.y*step/2)
let k3=field(x+k2.x*step/2,y+k2.y*step/2)
let k4=field(x+k3.x*step,y+k3.y*step)

let nx=x+step*(k1.x+2*k2.x+2*k3.x+k4.x)/6
let ny=y+step*(k1.y+2*k2.y+2*k3.y+k4.y)/6

return {x:nx,y:ny,dir:k4}

}

function nearCharge(x,y){

for(let c of charges){

let d=Math.hypot(x-c.x,y-c.y)

if(d<18) return true

}

return false

}

function nearExistingLine(x,y){

for(let line of fieldLines){

for(let p of line){

let d=Math.hypot(x-p.x,y-p.y)

if(d<LINE_MIN_DIST) return true

}

}

return false

}

function forbiddenDirection(c,angle){

for(let other of charges){

if(other===c) continue

if(other.q>0 && c.q>0){

let dx=other.x-c.x
let dy=other.y-c.y

let a=Math.atan2(dy,dx)

let diff=Math.abs(angle-a)

if(diff<0.35) return true

}

}

return false

}

function generateSeeds(){

let seeds=[]

for(let c of charges){

if(c.q>0){

let count=Math.abs(c.q)*16

for(let i=0;i<count;i++){

let a=2*Math.PI*i/count

if(forbiddenDirection(c,a)) continue

seeds.push({
x:c.x+16*Math.cos(a),
y:c.y+16*Math.sin(a),
dir:{x:Math.cos(a),y:Math.sin(a)},
source:c.q
})

}

}

}

let negativeCount=charges.filter(c=>c.q<0).length

if(negativeCount>0){

let edgeSeeds=32

for(let i=0;i<edgeSeeds;i++){

let x=i*(canvas.width/edgeSeeds)

seeds.push({x:x,y:0,dir:{x:0,y:1},source:-1})
seeds.push({x:x,y:canvas.height,dir:{x:0,y:-1},source:-1})

}

for(let i=0;i<edgeSeeds;i++){

let y=i*(canvas.height/edgeSeeds)

seeds.push({x:0,y:y,dir:{x:1,y:0},source:-1})
seeds.push({x:canvas.width,y:y,dir:{x:-1,y:0},source:-1})

}

}

return seeds

}

function generateFieldLines(){

fieldLines=[]
fieldLineSources=[]

let seeds=generateSeeds()

for(let seed of seeds){

let x=seed.x
let y=seed.y
let dir=seed.dir

let line=[]

for(let s=0;s<800;s++){

if(x<0||x>canvas.width||y<0||y>canvas.height) break

if(nearCharge(x,y)&&s>5) break

if(nearExistingLine(x,y)) break

line.push({x,y})

let f=electricField(x,y)
let mag=magnitude(f)

let step=BASE_STEP/(1+mag*1e-10)
step=Math.max(MIN_STEP,Math.min(MAX_STEP,step))

let next=rk4(x,y,dir,step)

x=next.x
y=next.y
dir=next.dir

}

if(line.length>10){

fieldLines.push(line)
fieldLineSources.push(seed.source)

}

}

}

function drawArrow(x,y,dx,dy){

let angle=Math.atan2(dy,dx)
let size=6

ctx.beginPath()

ctx.moveTo(x,y)
ctx.lineTo(x-size*Math.cos(angle-Math.PI/6),y-size*Math.sin(angle-Math.PI/6))
ctx.lineTo(x-size*Math.cos(angle+Math.PI/6),y-size*Math.sin(angle+Math.PI/6))

ctx.closePath()

ctx.fillStyle="yellow"
ctx.fill()

}

function drawFieldLines(){

generateFieldLines()

for(let i=0;i<fieldLines.length;i++){

let line=fieldLines[i]

ctx.beginPath()
ctx.moveTo(line[0].x,line[0].y)

for(let p of line){
ctx.lineTo(p.x,p.y)
}

ctx.lineWidth=1.5
ctx.strokeStyle=fieldLineSources[i]>0?"red":"blue"

ctx.stroke()

}

for(let line of fieldLines){

for(let i=15;i<line.length;i+=30){

let p=line[i]
let prev=line[i-1]

drawArrow(p.x,p.y,p.x-prev.x,p.y-prev.y)

}

}

}

function drawCharges(){

ctx.font="14px Arial"

for(let c of charges){

ctx.beginPath()
ctx.arc(c.x,c.y,15,0,Math.PI*2)

ctx.fillStyle=c.q>0?"red":"blue"
ctx.fill()

ctx.fillStyle="white"
ctx.fillText(c.name,c.x-30,c.y-20)

}

}

function drawProbe(){

if(!probe) return

ctx.beginPath()
ctx.arc(probe.x,probe.y,5,0,Math.PI*2)
ctx.fillStyle="yellow"
ctx.fill()

let f=electricField(probe.x,probe.y)
let mag=magnitude(f)

document.getElementById("fieldValue").innerText="E="+mag.toExponential(3)

}

canvas.onclick=e=>{
probe={x:e.offsetX,y:e.offsetY}
}

canvas.onmousedown=e=>{

for(let c of charges){

let d=Math.hypot(e.offsetX-c.x,e.offsetY-c.y)

if(d<20) dragging=c

}

}

canvas.onmouseup=()=>dragging=null

canvas.onmousemove=e=>{

if(dragging){

dragging.x=e.offsetX
dragging.y=e.offsetY

}

}

canvas.addEventListener("dblclick",e=>{

for(let c of charges){

let d=Math.hypot(e.offsetX-c.x,e.offsetY-c.y)

if(d<20) c.q*=-1

}

})

document.getElementById("chargeA").oninput=e=>{
charges[0].q=parseInt(e.target.value)
document.getElementById("valueA").innerText=e.target.value
}

document.getElementById("chargeB").oninput=e=>{
charges[1].q=parseInt(e.target.value)
document.getElementById("valueB").innerText=e.target.value
}

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height)

drawFieldLines()
drawCharges()
drawProbe()

requestAnimationFrame(draw)

}

draw()
