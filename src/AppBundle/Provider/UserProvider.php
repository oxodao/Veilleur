<?php

namespace AppBundle\Provider;

use AppBundle\Entity\User;
use Doctrine\Common\Persistence\ManagerRegistry;
use HWI\Bundle\OAuthBundle\OAuth\Response\UserResponseInterface;
use HWI\Bundle\OAuthBundle\Security\Core\User\OAuthAwareUserProviderInterface;
use HWI\Bundle\OAuthBundle\Security\Core\User\EntityUserProvider;

class UserProvider extends EntityUserProvider implements OAuthAwareUserProviderInterface
{
    public function __construct(ManagerRegistry $registry, array $properties = [], $managerName = null)
    {
        parent::__construct($registry, User::class, $properties, $managerName);
    }

    public function loadUserByOAuthUserResponse(UserResponseInterface $response)
    {
        $user = $this->findUser(['email' => $response->getEmail()]);

        if (null === $user) {
            $user = $this->createUser($response);
        }

        $user->setUsername($response->getUsername());
        $this->updateUser($user);

        return $user;
    }

    public function createUser(UserResponseInterface $uri) : User
    {
        return (new User())->setUsername($uri->getUsername())->setEmail($uri->getEmail());
    }

    public function updateUser($user)
    {
        $this->em->persist($user);
        $this->em->flush();
    }
}