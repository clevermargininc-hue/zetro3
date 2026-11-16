"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export function MarketingMotion(){
 const pathname=usePathname();
 useEffect(()=>{
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(media.matches)return;
  const elements=Array.from(document.querySelectorAll<HTMLElement>(".marketing-shell main section"));
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-revealed");observer.unobserve(entry.target);}});},{threshold:0.06,rootMargin:"0px 0px -25px 0px"});
  elements.forEach((element,index)=>{if(index===0){element.classList.add("marketing-enter");return;}if(element.getBoundingClientRect().top>window.innerHeight){element.classList.add("marketing-reveal");observer.observe(element);}});
  const change=()=>{if(media.matches){elements.forEach(el=>el.classList.remove("marketing-reveal","marketing-enter"));observer.disconnect();}};
  media.addEventListener("change",change);
  return()=>{observer.disconnect();media.removeEventListener("change",change);elements.forEach(el=>el.classList.remove("marketing-reveal","is-revealed","marketing-enter"));};
 },[pathname]);
 return null;
}
