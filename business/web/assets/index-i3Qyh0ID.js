import{n}from"./react-C8WUja5K.js";import{N as a}from"./index-4mvjMIZy.js";function l(e,o){const[s,c]=n.useState(()=>{try{const t=localStorage.getItem(e);return t?JSON.parse(t):o}catch(t){return a(t),o}});return[s,t=>{try{const r=t instanceof Function?t(s):t;c(r),localStorage.setItem(e,JSON.stringify(r))}catch(r){a(r)}}]}export{l as u};
//# sourceMappingURL=index-i3Qyh0ID.js.map
