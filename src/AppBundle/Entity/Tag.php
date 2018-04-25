<?php
namespace AppBundle\Entity;

use ApiPlatform\Core\Annotation\ApiFilter;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Serializer\Annotation\Groups;
use ApiPlatform\Core\Annotation\ApiResource;
use AppBundle\Filter\DuplicateFilter;

/**
 * @ORM\Entity(repositoryClass="AppBundle\Entity\Repository\TagRepository")
 * @ORM\Table(name="tag", indexes={@ORM\Index(name="name_idx", columns={"name"})})
 *
 * @author Yohan Giarelli <yohan@giarel.li>
 * @ApiResource(
 *    collectionOperations={ "get" },
 *    itemOperations={"get"},
 *  attributes={
 *     "normalization_context"={"groups"={"Tag"}},
 *     "denormalization_context"={"groups"={"Tag"}}
 * },
 * )
 * @ApiFilter(DuplicateFilter::class)
 */
class Tag
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     *
     * @var int
     */
    private $id;

    /**
     * @ORM\Column(type="string", unique=true)
     * @Groups({"WatchLink", "Tag"})
     *
     * @var string
     */
    private $name;

    /**
     * @ORM\ManyToMany(targetEntity="AppBundle\Entity\WatchLink", mappedBy="tags")
     *
     * @var ArrayCollection<WatchLink>
     */
    private $watchLinks;

    /**
     * @ORM\ManyToOne(targetEntity="AppBundle\Entity\Tag")
     *
     * @var Tag
     */
    private $mainTag;

    /**
     * @ORM\OneToMany(targetEntity="AppBundle\Entity\Tag", mappedBy="mainTag")
     *
     * @Groups({"Tag"})
     * @var ArrayCollection<Tag>
     */
    private $duplicates;

    public function __construct(string $name)
    {
        $this->name = $name;
        $this->watchLinks = new ArrayCollection();
    }

    /**
     * @return int
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * @return string
     */
    public function getName()
    {
        return $this->name;
    }

    /**
     * @return ArrayCollection<WatchLink>
     */
    public function getWatchLinks()
    {
        return $this->watchLinks;
    }

    public function setMainTag(Tag $tag)
    {
        $this->mainTag = $tag;
    }

    /**
     * @return ArrayCollection<Tag>
     */
    public function getDuplicates()
    {
        return $this->duplicates;
    }

    public function getRootTag() {
        if ($this->mainTag != null)
            return $this->mainTag->getRootTag();
        else
            return $this;
    }

    public function addDuplicate(Tag $tag)
    {
        if (($tag->mainTag != null && $tag->mainTag !== $this) || $this->mainTag === null) {
            if (!$this->duplicates->contains($tag)) {
                if ($this->mainTag !== null) {
                    return $this->mainTag->addDuplicate($tag);
                } else {
                    $this->duplicates->add($tag);
                    $tag->setMainTag($this);
                    return Response::HTTP_CREATED;
                }
            } else {
                return Response::HTTP_ALREADY_REPORTED;
            }
        }
        return Response::HTTP_LOOP_DETECTED;
    }
}
