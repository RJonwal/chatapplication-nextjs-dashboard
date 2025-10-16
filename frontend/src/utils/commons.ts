import Cookie from "js-cookie"

export const getCookie = (key: string) => {
  return Cookie.get(key)
}

export const setCookies = (key:string,value:any) => {
    return Cookie.set(key,value,{expires:2/24})
}

export const removeCookie = (key:string) => {
    return Cookie.remove(key)
}