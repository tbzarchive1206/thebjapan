(() => {
  "use strict";
  const DATA=window.TBJ_DATA;if(!DATA)return;
  const copy={
    en:{mainArchive:"MAIN ARCHIVE ↗",collections:"COLLECTIONS",media:"MEDIA",updated:"UPDATED",searchCollections:"SEARCH COLLECTIONS...",contents:"CONTENTS",openSource:"OPEN SOURCE FOLDER",noCollections:"NO COLLECTIONS FOUND",backTop:"BACK TO TOP ↑",galleries:"GALLERIES"},
    ko:{mainArchive:"메인 아카이브 ↗",collections:"컬렉션",media:"미디어",updated:"업데이트",searchCollections:"컬렉션 검색...",contents:"목록",openSource:"원본 폴더 열기",noCollections:"컬렉션을 찾을 수 없습니다",backTop:"맨 위로 ↑",galleries:"갤러리"}
  };
  const state={lang:localStorage.getItem("tbzJapanLang")==="ko"?"ko":"en",query:""};
  const $=selector=>document.querySelector(selector),driveFolder=id=>`https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
  const number=value=>new Intl.NumberFormat(state.lang==="ko"?"ko-KR":"en-US").format(value||0);
  const date=value=>{if(!value)return"—";const current=new Date(value);return state.lang==="ko"?new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}).format(current):new Intl.DateTimeFormat("en-GB",{day:"2-digit",month:"short",year:"numeric"}).format(current).toUpperCase()};
  function folderCard(collection,index){const link=document.createElement("a");link.className="folder";link.href=`${collection.slug}/index.html`;const position=document.createElement("span");position.className="folder-number";position.textContent=String(index+1).padStart(2,"0");const title=document.createElement("strong");title.textContent=state.lang==="ko"&&collection.nameKo?collection.nameKo:collection.nameEn;const meta=document.createElement("small");meta.textContent=`${number(collection.galleryCount)} ${copy[state.lang].galleries} · ${number(collection.itemCount)} ${copy[state.lang].media} →`;link.append(position,title,meta);return link}
  function render(){const grid=$("#folderGrid");grid.replaceChildren();const visible=DATA.collections.filter(collection=>`${collection.name} ${collection.nameEn} ${collection.nameKo}`.toLocaleLowerCase().includes(state.query));visible.forEach((collection,index)=>grid.append(folderCard(collection,index)));$("#visibleCollections").textContent=number(visible.length);$("#empty").hidden=visible.length!==0}
  function applyLanguage(){const lang=copy[state.lang];document.documentElement.lang=state.lang==="ko"?"ko":"en";$("#langToggle").textContent=state.lang==="ko"?"KOR":"EN";document.querySelectorAll("[data-i18n]").forEach(element=>{element.textContent=lang[element.dataset.i18n]});document.querySelectorAll("[data-i18n-placeholder]").forEach(element=>{element.placeholder=lang[element.dataset.i18nPlaceholder]});$("#collectionCount").textContent=number(DATA.collectionCount);$("#mediaCount").textContent=number(DATA.itemCount);$("#updatedDate").textContent=date(DATA.updatedAt);render()}
  $("#rootDrive").href=driveFolder(DATA.sourceFolderId);$("#collectionSearch").addEventListener("input",event=>{state.query=event.target.value.trim().toLocaleLowerCase();render()});$("#langToggle").addEventListener("click",()=>{state.lang=state.lang==="en"?"ko":"en";localStorage.setItem("tbzJapanLang",state.lang);applyLanguage()});applyLanguage();
})();
