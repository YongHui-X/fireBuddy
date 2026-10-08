from dataclasses import dataclass
from typing import Annotated

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings


bearer_scheme = HTTPBearer(auto_error=False)
jwks_client = PyJWKClient(settings.supabase_jwks_url)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str | None = None
    # True for the invisible session the phone creates when DouDou is turned on.
    is_anonymous: bool = False


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    token = credentials.credentials

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=settings.supabase_auth_issuer,
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        ) from exc
    except jwt.PyJWKClientError:
        if not settings.supabase_jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid bearer token",
            )

        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                issuer=settings.supabase_auth_issuer,
            )
        except jwt.ExpiredSignatureError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            ) from exc
        except jwt.PyJWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid bearer token",
            ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        ) from exc

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing a user subject",
        )

    return AuthenticatedUser(
        id=user_id,
        email=payload.get("email"),
        is_anonymous=payload.get("is_anonymous") is True,
    )


def require_registered_user(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    """Keep anonymous phone sessions to DouDou chat, consent and account deletion.

    The phone keeps every record on the device, so an anonymous token never needs
    the record routes. Anyone holding the public anon key can mint one, so they
    must not be able to write rows or spend OpenAI calls outside DouDou.
    """

    if user.is_anonymous:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This route needs a signed-in account",
        )
    return user
