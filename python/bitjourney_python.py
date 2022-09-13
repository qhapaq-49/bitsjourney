import argparse
import heapq
from typing import Dict, List

import numpy as np
from skimage.io import imread, imsave


class ImageBlock:
    def __init__(self):
        self.indice = []
        self.neighbor = []
        self.generation = 0

    def calc_moment(self, img_data):
        self.moment = [0, 0, 0]
        if len(self.indice) == 0:
            return
        for i in range(3):
            for idx in self.indice:
                self.moment[i] += img_data[idx][i]
            self.moment[i] = self.moment[i] / len(self.indice)


class BlockUnionFind(object):
    """
    blockをunionfindで管理する。unionfindの必要性はまったくない。
    が。データの可視化に使えるかもしれないしunionfindは十分早いので使う
    """

    def __init__(self, blocks: List[ImageBlock]) -> None:
        n = len(blocks)
        self.parent = [i for i in range(n)]
        self.rank = [0 for _ in range(n)]
        self.size = [1 for _ in range(n)]
        self.blocks = blocks

    def find(self, x: int) -> int:
        if self.parent[x] == x:
            return x
        else:
            self.parent[x] = self.find(self.parent[x])
            return self.parent[x]

    def union(self, x: int, y: int) -> int:
        x = self.find(x)
        y = self.find(y)
        if x != y:
            if self.rank[x] < self.rank[y]:
                x, y = y, x
            if self.rank[x] == self.rank[y]:
                self.rank[x] += 1
            self.parent[y] = x
            self.size[x] += self.size[y]

            merge_block(self.blocks[x], self.blocks[y])
            return x
        return -1

    def get_groups(self) -> List[List[int]]:
        groups: Dict[int, List[int]] = {}
        for i in range(self.data_size):
            groups.setdefault(self.find(i), []).append(i)
        return [group for group in groups.values()]


def merge_block(block1, block2):
    # merge moment
    if len(block1.indice) != 0 or len(block2.indice) != 0:
        for i in range(3):
            block1.moment[i] = (
                block1.moment[i] * len(block1.indice)
                + block2.moment[i] * len(block2.indice)
            ) / (len(block1.indice) + len(block2.indice))

    # merge neighbor
    for idx in block2.indice:
        block1.indice.append(idx)

    for nei in block2.neighbor:
        block1.neighbor.append(nei)

    block1.neighbor = list(set(block1.neighbor))
    # block1のgenerationを増やす
    block1.generation += 1
    # block2はmerge済とする
    block2.generation = -1


def calc_weight_dissimilarity(block1, block2):
    num = len(block1.indice) * len(block2.indice)
    dist = 0.0
    # print(len(block1.indice), len(block2.indice), block1.moment, block2.moment)
    for i in range(3):
        # dist += np.sqrt((block1.moment[i] - block2.moment[i]) ** 2)
        dist += (block1.moment[i] - block2.moment[i]) ** 2
    dist = np.sqrt(dist)
    return dist * num


def set_zero_group(blocks, check_list, checked, zero_cluster, neighbors):
    while True:
        if len(check_list) == 0:
            return
        root = check_list.pop()
        for nei in blocks[root].neighbor:
            if nei in zero_cluster or nei in neighbors:
                continue
            if len(blocks[nei].indice) != 0:
                neighbors.add(nei)
            else:
                checked.add(nei)
                zero_cluster.add(nei)
                check_list.add(nei)


def purge_zero_groups(blocks):
    checked = set()
    zero_set = set()
    neighbors_list = []
    nonzero = 0
    for i in range(len(blocks)):
        if i in checked:
            continue
        if len(blocks[i].indice) == 0:
            zero_cluster = set([i])
            neighbors = set()
            set_zero_group(blocks, set([i]), checked, zero_cluster, neighbors)
            zero_set = zero_set | zero_cluster
            neighbors_list.append(neighbors)
            print("zero cluster", len(zero_cluster), len(neighbors))
        else:
            nonzero += 1
    print("nonzero", nonzero)
    return zero_set, neighbors_list


def resize_image(
    image,
    color_list,
    pixel_size: int,
    use_line_filter: bool = True,
    cnt_ratio: float = 0.1,
):
    output = np.zeros((image.shape[0], image.shape[1], 3))
    h_itr = image.shape[0] // pixel_size + 1
    w_itr = image.shape[1] // pixel_size + 1
    for y in range(h_itr):
        for x in range(w_itr):
            img_filter = image[
                y * pixel_size : min(image.shape[0], (y + 1) * pixel_size)
            ]
            img_filter = img_filter[
                :, x * pixel_size : min(image.shape[1], (x + 1) * pixel_size)
            ]
            value, cnt = np.unique(img_filter, return_counts=True)
            cnt_dict = {}
            for v, c in zip(value, cnt):
                cnt_dict[v] = c
            # line補正を入れる場合、周辺のブロックの情報を引く（ことで周囲を同じ色に囲まれた線を保護する）
            if use_line_filter and y > 0 and x > 0 and y < h_itr - 1 and x < w_itr - 1:
                img_filter_line = image[
                    (y - 1) * pixel_size : min(image.shape[0], (y + 2) * pixel_size)
                ]
                img_filter_line = img_filter_line[
                    :, (x - 1) * pixel_size : min(image.shape[1], (x + 2) * pixel_size)
                ]
                value, cnt = np.unique(img_filter_line, return_counts=True)
                for v, c in zip(value, cnt):
                    if v in cnt_dict:
                        cnt_dict[v] -= c * cnt_ratio
            max_key = -1
            max_value = -np.inf
            for key in cnt_dict:
                if cnt_dict[key] > max_value:
                    max_value = cnt_dict[key]
                    max_key = key
            # print(cnt_dict)
            output[
                y * pixel_size : min(image.shape[0], (y + 1) * pixel_size),
                x * pixel_size : min(image.shape[1], (x + 1) * pixel_size),
            ] = color_list[max_key]
    return output


def union(image, color_target, rgb_mesh, retry_cnt: int = 0, retry_max: int = 1):
    img_flat = np.reshape(image, (image.shape[0] * image.shape[1], image.shape[2]))
    blocks = [ImageBlock() for _ in range(rgb_mesh[0] * rgb_mesh[1] * rgb_mesh[2])]
    for i in range(len(blocks)):
        if i % rgb_mesh[2] != 0:
            blocks[i].neighbor.append(i - 1)
        if i % rgb_mesh[2] != rgb_mesh[2] - 1:
            blocks[i].neighbor.append(i + 1)
        if (i // rgb_mesh[2]) % rgb_mesh[1] != 0:
            blocks[i].neighbor.append(i - rgb_mesh[2])
        if (i // rgb_mesh[2]) % rgb_mesh[1] != rgb_mesh[1] - 1:
            blocks[i].neighbor.append(i + rgb_mesh[2])
        if (i // (rgb_mesh[2] * rgb_mesh[1])) % rgb_mesh[0] != 0:
            blocks[i].neighbor.append(i - (rgb_mesh[1] * rgb_mesh[2]))
        if (i // (rgb_mesh[2] * rgb_mesh[1])) % rgb_mesh[0] != rgb_mesh[0] - 1:
            blocks[i].neighbor.append(i + (rgb_mesh[1] * rgb_mesh[2]))

    for i, color in enumerate(img_flat):
        id_x = rgb_mesh[0] * color[0] // 256
        id_y = rgb_mesh[1] * color[1] // 256
        id_z = rgb_mesh[2] * color[2] // 256
        idx = id_x * rgb_mesh[1] * rgb_mesh[2] + id_y * rgb_mesh[2] + id_z
        # print(id_x, id_y, id_z, idx)
        blocks[idx].indice.append(i)
    for block in blocks:
        block.calc_moment(img_flat)

    nonzero = 0
    for block in blocks:
        if len(block.indice) != 0:
            nonzero += 1
    block_to_merge = nonzero - color_target
    if block_to_merge < 0:
        if retry_cnt < retry_max:
            print("warning too small mesh. retry", nonzero, rgb_mesh)
            return union(
                image,
                color_target,
                (rgb_mesh[0] * 2, rgb_mesh[1] * 2, rgb_mesh[2] * 2),
                retry_cnt + 1,
                retry_max,
            )
        else:
            print(f"warning too small mesh. decrease color to {nonzero-1}")
            color_target = nonzero - 1
            block_to_merge = 1

    zero_set, zero_neighbors = purge_zero_groups(blocks)
    block_union = BlockUnionFind(blocks)
    merge_heap = []
    for zero_neighbor in zero_neighbors:
        for idx in zero_neighbor:
            for zn in zero_neighbor:
                if zn != idx:
                    blocks[idx].neighbor.append(zn)

    for i in range(len(blocks)):
        if i in zero_set:
            blocks[i].generation = -1
            continue
        for nei in blocks[i].neighbor:
            if nei in zero_set:
                continue
            imp = calc_weight_dissimilarity(blocks[i], blocks[nei])
            # print("value", (imp, i, blocks[i].generation, nei, blocks[nei].generation))
            heapq.heappush(
                merge_heap, (imp, i, blocks[i].generation, nei, blocks[nei].generation)
            )
    print("heap length", len(merge_heap))
    block_merged = 0
    que_resolve = 0
    que_gen = 0
    while True:
        que_resolve += 1
        merge_candidate = heapq.heappop(merge_heap)
        if block_union.find(merge_candidate[1]) != merge_candidate[1]:
            continue
        if blocks[merge_candidate[1]].generation != merge_candidate[2]:
            continue

        if block_union.find(merge_candidate[3]) != merge_candidate[3]:
            continue

        if blocks[merge_candidate[3]].generation != merge_candidate[4]:
            continue

        root = block_union.union(merge_candidate[1], merge_candidate[3])
        block_merged += 1
        if block_merged == block_to_merge:
            break

        for new_nei in blocks[root].neighbor:
            nei_to_use = block_union.find(new_nei)
            if nei_to_use == root:
                continue
            if blocks[nei_to_use].generation == -1:
                continue
            imp = calc_weight_dissimilarity(blocks[root], blocks[nei_to_use])
            candidate = (
                imp,
                root,
                blocks[root].generation,
                nei_to_use,
                blocks[nei_to_use].generation,
            )
            heapq.heappush(merge_heap, candidate)
            que_gen += 1

    # print(que_gen, "que is generated")
    # print(que_resolve, "que is resolved")

    cnt = 0
    block_num = 0
    color_list = []
    img_idx = np.zeros(img_flat.shape[0], dtype=np.int)
    for block in blocks:
        if block.generation != -1:
            block_num += 1
            cnt += len(block.indice)
            for idx in block.indice:
                img_flat[idx] = np.asarray(block.moment, dtype=np.int)
                img_idx[idx] = len(color_list)
            color_list.append(np.asarray(block.moment, dtype=np.int))
    assert cnt == image.shape[0] * image.shape[1]
    img_parsed = img_flat.reshape(image.shape[0], image.shape[1], image.shape[2])
    img_idx = img_idx.reshape(image.shape[0], image.shape[1])
    return img_parsed, color_list, img_idx


parser = argparse.ArgumentParser(
    description="Color quantization using importance wighted dissimilarity."
)
parser.add_argument(
    "-c",
    "--colors",
    type=int,
    help="Number of colors needed in power of 2, ex: for 16 colors pass 4 because 2^4 = 16",
)
parser.add_argument("-m", "--mesh", type=int, default=4, help="size of mesh")
parser.add_argument("-p", "--pixel_size", type=int, default=2, help="pixel size for quantization")
parser.add_argument("-i", "--input", type=str, help="path of the image to be quantized")
parser.add_argument(
    "-o", "--output", type=str, help="output path for the quantized image"
)

# get the arguments
args = parser.parse_args()

# get the values from the arguments
colors = args.colors

output_path = args.output
input_path = args.input

# read the image
sample_img = imread(input_path)
mesh_size = args.mesh
while True:
    if mesh_size * mesh_size * mesh_size <= args.colors:
        print("mesh size is too small")
        mesh_size += 1
    else:
        break
img, color_list, img_idx = union(
    sample_img, args.colors, (mesh_size, mesh_size, mesh_size)
)
xy_ratio = img.shape[0] / img.shape[1]
img = resize_image(img_idx, color_list, 3, use_line_filter=False)
imsave(output_path, img)
