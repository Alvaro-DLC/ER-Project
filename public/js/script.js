async function listsToLoad(id){
  displayLists("bossList", id);
  displayLists("weaponList", id);
  displayLists("armorList", id);
}
async function displayLists(listType, id){
  let url = "/api/"+listType+"/"+id;
  let response = await fetch(url);
  let data = await response.json();
  if(data.length != 0){
    if(listType == "bossList"){
      displayList("bosses", data);
    }
    else if(listType == "weaponList"){
      displayList("weapons", data);
    }
    else if (listType == "armorList"){
      displayList("armors", data);
    }
  }
}
async function displayList(tag, list){
  let noImg = document.createElement("h5");
  noImg.innerText = "[Image Unavailable]";
  for(let id of list){
    let url = `https://eldenring.fanapis.com/api/${tag}/${id}`;
    let response = await fetch(url);
    let data = await response.json();
    let itemName = document.createElement("h3");
    itemName.innerText = data.data.name;
    let itemImg = document.createElement("img");
    itemImg.src = data.data.image;
    itemImg.style.height = '150px';
    itemImg.style.width = 'auto'
    let spacing = document.createElement("hr");
    let lineBreak = document.createElement('br');
    document.querySelector(`#${tag}`).appendChild(itemName);
    document.querySelector(`#${tag}`).appendChild(lineBreak);
    if (data.data.image == null){
      document.querySelector(`#${tag}`).appendChild(noImg);
    } else {
      document.querySelector(`#${tag}`).appendChild(itemImg);
    }
    document.querySelector(`#${tag}`).appendChild(spacing);
  }
}