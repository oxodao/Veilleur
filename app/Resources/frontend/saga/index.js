import { RETREIVE_TAGS, retreivedTagsAction, retreiveTagsAction } from "../actions/tags_actions";
import { filterAction, UPDATE_FILTER_ACTION }                     from "../actions/filter_actions";
import { call, put, takeEvery, select }                           from "redux-saga/effects";
import { receivedLinksAction }                                    from "../actions/links_actions";
import Config                                                     from "../Config";
import Link                                                       from "../model/Link";
import Tag                                                        from '../model/Tag';
import { clearDialogAction, DISCOVER_DIALOG, toggleDialogAction } from "../actions/addlinks_actions";
import { updateSnackbarAction }                                   from "../actions/snackbar_actions";
import { LINK_TAG_ACTION, linkingClickAction }                    from "../actions/linkingtags_actions";
import { readTokenAction }                                        from "../actions/token_actions";

function parseURL(url) {
    let params = url.split("&");

    for (let i = 0; i < params.length; ++i)
        if (params[ i ].startsWith("page"))
            return (params[ i ].split("=")[ 1 ]);
    return 1;

}

function* fetchFromFilter(action) {
    let pl  = action.payload;
    let url = Config.API_HOST + "watch_links?page=" + pl.currPage + "&order[createdAt]=" + pl.order;

    if (undefined !== pl.selectedTags && null !== pl.selectedTags) {
        for (let i = 0; i < pl.selectedTags.length; ++i) {
            url += "&tags[]=" + pl.selectedTags[ i ];
        }
    }

    if (undefined !== pl.search && pl.search.length !== 0) {
        url += "&search=" + pl.search;
    }

    try {
        const res = yield call(fetch, url);
        let links = yield call([ res, 'json' ]);

        let tmp = links[ 'hydra:view' ];

        let currPage = parseURL(tmp[ '@id' ]);         // Parsing the current page id
        let amtPages = (undefined !== tmp[ 'hydra:last' ]) ? parseURL(tmp[ 'hydra:last' ]) : 1;  // Parsing the last page id

        links = links[ 'hydra:member' ];
        links = links.map((lnk) => (new Link(lnk)));

        yield put(receivedLinksAction({ links, currPage, amtPages }));
    } catch (err) {
        console.log("Err: ", err);
    }
}

function* fetchTags() {
    let url = Config.API_HOST + 'tags?show_duplicates=false';

    try {
        const res = yield call(fetch, url);
        let tags  = yield call([ res, 'json' ]);
        tags      = tags[ 'hydra:member' ];
        tags      = tags.map((tag) => (new Tag(tag)));

        yield put(retreivedTagsAction({ tags }));
    } catch (err) {
        console.log("Err: ", err);
    }
}

function* discover(action) {
    let url = Config.API_HOST + 'watch_links/discover';

    try {
        let tags = [];
        if (undefined !== action.payload.tags) {
            tags = action.payload.tags.map((tag) => tag.name);
        }

        const token = yield select((item) => (item.tokenReducer));
        if(yield checkToken(token.token, token.refreshToken)) {
            const token = yield select((item) => (item.tokenReducer));

            const res = yield call(fetch, url, {
                headers: {
                    'Accept'       : 'application/ld+json',
                    'Content-Type' : 'application/ld+json',
                    'Authorization': 'Bearer ' + token.token
                },
                method : 'POST',
                body   : JSON.stringify({
                    'url'    : action.payload.url,
                    'taglist': tags
                })
            });

            if (201 === res.status) {
                yield put(toggleDialogAction());
                yield put(clearDialogAction());
                yield put(updateSnackbarAction({ open: true, message: 'Lien ajouté!' }));
                yield put(retreiveTagsAction());
                yield put(filterAction());
            } else {
                yield put(updateSnackbarAction({
                    open   : true,
                    message: 'Une erreur est survenue! (' + res.status + ')'
                }));
                console.log(res);
            }
        }
    } catch (err) {
        console.log("Err: ", err);
    }


}

function* linkTag(action) {
    let url = Config.API_HOST + 'tags/link/' + action.payload.masterTag.name + '/' + action.payload.slaveTag.name;

    const token = yield select((item) => (item.tokenReducer));

    if(yield checkToken(token.token, token.refreshToken)) {
        // Getting tokenreducer's content again so that if the token was refreshed it is now the good one
        const token = yield select((item) => (item.tokenReducer));
        try {
            const res = yield call(fetch, url, {
                headers: {
                    'Accept'       : 'application/ld+json',
                    'Content-Type' : 'application/ld+json',
                    'Authorization': 'Bearer ' + token.token
                },
                method : 'POST',
            });

            if (201 === res.status) {
                yield put(linkingClickAction({ masterTag: null, slaveTag: null }));
                yield put(updateSnackbarAction({ open: true, message: 'Tags liés!' }));
                yield put(retreiveTagsAction());
                yield put(filterAction());
            } else {
                yield put(updateSnackbarAction({
                    open   : true,
                    message: 'Une erreur est survenue! (' + res.status + ')'
                }));
                console.log(res);
            }
        } catch (err) {
            console.log("Err: ", err);
        }
    }

}

function* checkToken(token, refresh) {
    let decoded_token = jwt_decode(token);
    if (undefined !== decoded_token.exp) {
        if (decoded_token.exp < Date.now().valueOf() / 1000){
            const res = yield call(fetch, Config.API_HOST + 'token/refresh', {
                headers: {
                    'Accept': 'application/ld+json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                method: 'POST',
                body: 'refresh_token=' + refresh
            });

            if (200 === res.status) {
                let newToken = yield call([ res, 'json' ]);
                localStorage["token"] = newToken["token"];
                localStorage["refresh_token"] = newToken["refresh_token"];
                yield put(readTokenAction({ token: newToken["token"], refreshToken: newToken["refresh_token"] }));
            } else {
                localStorage.removeItem("token");
                localStorage.removeItem("refresh_token");
                yield put(updateSnackbarAction({ open: true, message: 'Votre token à expiré et ne peut être renouvelé' }));
                return false;
            }
        }
    }
    return true;
}

export default function* vsaga() {
    yield takeEvery(UPDATE_FILTER_ACTION, fetchFromFilter);
    yield takeEvery(RETREIVE_TAGS, fetchTags);
    yield takeEvery(DISCOVER_DIALOG, discover);
    yield takeEvery(LINK_TAG_ACTION, linkTag);
}